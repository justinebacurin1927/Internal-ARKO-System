from rest_framework import serializers
from .models import Conversation, ConversationParticipant, Message

class ParticipantSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='user.id')
    name = serializers.CharField(source='user.name', default=None)
    email = serializers.EmailField(source='user.email')

    class Meta:
        model = ConversationParticipant
        fields = ('id', 'name', 'email')

class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ('id', 'content', 'sender', 'sender_name', 'conversation', 'created_at')
        read_only_fields = ('sender', 'sender_name', 'created_at')

    def get_sender_name(self, obj):
        return obj.sender.name if obj.sender else None

class ConversationListSerializer(serializers.ModelSerializer):
    participants = ParticipantSerializer(many=True, read_only=True)
    messages = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ('id', 'created_at', 'updated_at', 'participants', 'messages')

    def get_messages(self, obj):
        msgs = obj.messages.all().order_by('-created_at')[:1]
        return MessageSerializer(msgs, many=True).data

class ConversationSerializer(serializers.ModelSerializer):
    participants = ParticipantSerializer(many=True, read_only=True)
    messages = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ('id', 'created_at', 'updated_at', 'participants', 'messages')

    def get_messages(self, obj):
        msgs = obj.messages.all().order_by('-created_at')
        return MessageSerializer(msgs, many=True).data
