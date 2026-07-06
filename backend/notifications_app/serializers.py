from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    actor_image = serializers.SerializerMethodField()
    is_read = serializers.BooleanField(read_only=True)
    time_ago = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ('id', 'recipient', 'actor', 'actor_name', 'actor_image',
                  'notification_type', 'task', 'message', 'read_at', 'created_at',
                  'is_read', 'time_ago')
        read_only_fields = ('id', 'recipient', 'actor', 'notification_type',
                           'task', 'message', 'created_at', 'is_read', 'time_ago')

    def get_actor_name(self, obj):
        return obj.actor.name if obj.actor else 'System'

    def get_actor_image(self, obj):
        return obj.actor.image if obj.actor else None

    def get_time_ago(self, obj):
        from django.utils import timezone
        now = timezone.now()
        diff = now - obj.created_at
        if diff.days > 0:
            return f'{diff.days}d ago'
        hours = diff.seconds // 3600
        if hours > 0:
            return f'{hours}h ago'
        minutes = diff.seconds // 60
        if minutes > 0:
            return f'{minutes}m ago'
        return 'just now'
