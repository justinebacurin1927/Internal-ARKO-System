from rest_framework import serializers
from .models import Idea


class IdeaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Idea
        fields = ('id', 'title', 'description', 'status', 'tags',
                  'spawned_task_id', 'created_at', 'updated_at')
        read_only_fields = ('id', 'spawned_task_id', 'created_at', 'updated_at')
