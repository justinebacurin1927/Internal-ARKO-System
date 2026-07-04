from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction
from django.db import models as db_models
from .models import Conversation, ConversationParticipant, Message
from .serializers import ConversationListSerializer, ConversationSerializer, MessageSerializer

class ConversationListView(APIView):
    def get(self, request):
        convs = Conversation.objects.filter(participants__user=request.user).prefetch_related(
            'participants__user', 'messages'
        ).order_by('-updated_at')
        serializer = ConversationListSerializer(convs, many=True)
        return Response(serializer.data)

class MessageListView(APIView):
    def get(self, request, conversation_id):
        ConversationParticipant.objects.get(conversation_id=conversation_id, user=request.user)
        cursor = request.query_params.get('cursor')
        limit = int(request.query_params.get('limit', 50))
        qs = Message.objects.filter(conversation_id=conversation_id).select_related('sender').order_by('-created_at')
        if cursor:
            from django.utils.dateparse import parse_datetime
            qs = qs.filter(created_at__lt=parse_datetime(cursor))
        qs = qs[:limit + 1]
        has_more = len(qs) > limit
        if has_more:
            qs = list(qs)
            last = qs.pop()
            next_cursor = last.created_at.isoformat()
        else:
            next_cursor = None
        serializer = MessageSerializer(reversed(qs), many=True)
        return Response({'messages': serializer.data, 'next_cursor': next_cursor, 'has_more': has_more})

    def post(self, request, conversation_id):
        ConversationParticipant.objects.get(conversation_id=conversation_id, user=request.user)
        serializer = MessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            msg = serializer.save(conversation_id=conversation_id, sender=request.user)
            Conversation.objects.filter(id=conversation_id).update(updated_at=msg.created_at)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MessageDetailView(APIView):
    """PATCH to edit, DELETE to remove a single message (sender only)."""

    def patch(self, request, pk):
        try:
            msg = Message.objects.select_related('conversation').get(pk=pk, sender=request.user)
        except Message.DoesNotExist:
            return Response({'detail': 'Message not found'}, status=404)

        serializer = MessageSerializer(msg, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(edited=True)

        Conversation.objects.filter(id=msg.conversation_id).update(updated_at=timezone.now())
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            msg = Message.objects.get(pk=pk, sender=request.user)
        except Message.DoesNotExist:
            return Response({'detail': 'Message not found'}, status=404)

        conv_id = msg.conversation_id
        msg.delete()
        Conversation.objects.filter(id=conv_id).update(updated_at=msg.created_at)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CreateConversationView(APIView):
    def post(self, request):
        participant_ids = request.data.get('participant_ids') or []
        single_id = request.data.get('participant_id')

        if single_id and not participant_ids:
            participant_ids = [single_id]

        if not participant_ids:
            return Response({'detail': 'participant_id or participant_ids required'}, status=400)

        # Filter out self and invalid users
        if str(request.user.id) in participant_ids:
            participant_ids = [p for p in participant_ids if p != str(request.user.id)]

        if not participant_ids:
            return Response({'detail': 'Cannot start a conversation with yourself'}, status=400)

        from django.contrib.auth import get_user_model
        User = get_user_model()
        valid_ids = set(User.objects.filter(id__in=participant_ids).values_list('id', flat=True))
        participant_ids = [str(uid) for uid in valid_ids]

        if not participant_ids:
            return Response({'detail': 'No valid users found'}, status=404)

        # For exactly 2 participants total, check for existing conversation
        if len(participant_ids) == 1:
            other_id = participant_ids[0]
            existing = Conversation.objects.filter(
                participants__user=request.user
            ).filter(
                participants__user__id=other_id
            ).annotate(
                cnt=db_models.Count('participants')
            ).filter(cnt=2)
            if existing.exists():
                serializer = ConversationSerializer(existing.first())
                return Response(serializer.data)

        with transaction.atomic():
            conv = Conversation.objects.create()
            ConversationParticipant.objects.create(conversation=conv, user=request.user)
            for uid in participant_ids:
                ConversationParticipant.objects.create(conversation=conv, user_id=uid)

        serializer = ConversationSerializer(conv)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
