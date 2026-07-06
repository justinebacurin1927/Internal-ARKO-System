from rest_framework import serializers
from django.db.models import Count, Q
from .models import Conversation, ConversationParticipant, Message

class ParticipantSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='user.id')
    name = serializers.CharField(source='user.name', default=None)
    email = serializers.EmailField(source='user.email')

    class Meta:
        model = ConversationParticipant
        fields = ('id', 'name', 'email')

class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ('id', 'content', 'sender', 'sender_name', 'conversation', 'created_at', 'edited')
        read_only_fields = ('sender', 'sender_name', 'created_at', 'edited', 'conversation')

    def get_sender_name(self, obj):
        return obj.sender.name if obj.sender else None

class ConversationListSerializer(serializers.ModelSerializer):
    participants = ParticipantSerializer(many=True, read_only=True)
    messages = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ('id', 'created_at', 'updated_at', 'participants', 'messages', 'unread_count')

    def get_messages(self, obj):
        msgs = obj.messages.all().order_by('-created_at')[:1]
        return MessageSerializer(msgs, many=True).data

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0
        try:
            participant = obj.participants.get(user=request.user)
            last_read = participant.last_read_at
            qs = obj.messages.exclude(sender=request.user)
            if last_read:
                qs = qs.filter(created_at__gt=last_read)
            return qs.count()
        except ConversationParticipant.DoesNotExist:
            return 0

class ConversationSerializer(serializers.ModelSerializer):
    participants = ParticipantSerializer(many=True, read_only=True)
    messages = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ('id', 'created_at', 'updated_at', 'participants', 'messages', 'unread_count')

    def get_messages(self, obj):
        msgs = obj.messages.all().order_by('-created_at')
        return MessageSerializer(msgs, many=True).data

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0
        try:
            participant = obj.participants.get(user=request.user)
            last_read = participant.last_read_at
            qs = obj.messages.exclude(sender=request.user)
            if last_read:
                qs = qs.filter(created_at__gt=last_read)
            return qs.count()
        except ConversationParticipant.DoesNotExist:
            return 0
