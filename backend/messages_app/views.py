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

class CreateConversationView(APIView):
    def post(self, request):
        participant_id = request.data.get('participant_id')
        if not participant_id:
            return Response({'detail': 'participant_id required'}, status=400)
        if participant_id == str(request.user.id):
            return Response({'detail': 'Cannot start a conversation with yourself'}, status=400)
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            User.objects.get(id=participant_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found'}, status=404)
        existing = Conversation.objects.filter(
            participants__user=request.user
        ).filter(
            participants__user__id=participant_id
        ).annotate(
            cnt=db_models.Count('participants')
        ).filter(cnt=2)
        if existing.exists():
            serializer = ConversationSerializer(existing.first())
            return Response(serializer.data)
        with transaction.atomic():
            conv = Conversation.objects.create()
            ConversationParticipant.objects.create(conversation=conv, user=request.user)
            ConversationParticipant.objects.create(conversation=conv, user_id=participant_id)
        serializer = ConversationSerializer(conv)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
