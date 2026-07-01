from rest_framework import serializers
from .models import Task

class TaskSerializer(serializers.ModelSerializer):
    assignee_name = serializers.SerializerMethodField()
    assignee_email = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = ('id', 'title', 'description', 'status', 'priority', 'assignee',
                  'assignee_name', 'assignee_email', 'due_date', 'position', 'created_at', 'updated_at')
        read_only_fields = ('assignee_name', 'assignee_email')

    def get_assignee_name(self, obj):
        return obj.assignee.name if obj.assignee else None

    def get_assignee_email(self, obj):
        return obj.assignee.email if obj.assignee else None
