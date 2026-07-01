from rest_framework import serializers
from .models import Reminder

class ReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reminder
        fields = ('id', 'title', 'note', 'due_at', 'is_done', 'created_at')
        read_only_fields = ('user', 'created_at')
