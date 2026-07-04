from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ('id', 'user', 'notif_type', 'title', 'message', 'link',
                  'read', 'created_at')
        read_only_fields = ('id', 'user', 'created_at')
