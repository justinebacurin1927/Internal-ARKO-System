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
from .consumers import broadcast_new_message

class ConversationListView(APIView):
    def get(self, request):
        convs = Conversation.objects.filter(participants__user=request.user).prefetch_related(
            'participants__user', 'messages'
        ).order_by('-updated_at')
        serializer = ConversationListSerializer(convs, many=True, context={'request': request})
        return Response(serializer.data)


class MarkConversationReadView(APIView):
    """Mark all messages in a conversation as read for the current user."""

    def post(self, request, conversation_id):
        try:
            participant = ConversationParticipant.objects.get(
                conversation_id=conversation_id, user=request.user
            )
        except ConversationParticipant.DoesNotExist:
            return Response({'detail': 'Conversation not found'}, status=404)

        participant.last_read_at = timezone.now()
        participant.save(update_fields=['last_read_at'])
        return Response({'status': 'read'})

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
        # Broadcast via WebSocket for real-time delivery
        broadcast_new_message(msg)
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

        # Filter out self from incoming list
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

        # Check for existing conversation with the exact same participant set
        target_ids = {int(request.user.id)} | {int(uid) for uid in participant_ids}
        target_count = len(target_ids)

        existing = (
            Conversation.objects
            .annotate(
                total_cnt=db_models.Count('participants'),
                match_cnt=db_models.Count(
                    'participants',
                    filter=db_models.Q(participants__user_id__in=target_ids),
                ),
                has_user=db_models.Count(
                    'participants',
                    filter=db_models.Q(participants__user_id=request.user.id),
                ),
            )
            .filter(
                total_cnt=target_count,
                match_cnt=target_count,
                has_user__gte=1,
            )
        )

        if existing.exists():
            serializer = ConversationSerializer(existing.first(), context={'request': request})
            return Response(serializer.data)

        with transaction.atomic():
            conv = Conversation.objects.create()
            ConversationParticipant.objects.create(conversation=conv, user=request.user)
            for uid in participant_ids:
                ConversationParticipant.objects.create(conversation=conv, user_id=uid)

        serializer = ConversationSerializer(conv, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
