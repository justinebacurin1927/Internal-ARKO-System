from rest_framework import serializers
from .models import Event, Sprint

class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ('id', 'title', 'description', 'date', 'start_time', 'end_time', 'color', 'created_at', 'updated_at')
        read_only_fields = ('user', 'created_at', 'updated_at')


class SprintSerializer(serializers.ModelSerializer):
    tasks_total = serializers.SerializerMethodField()
    tasks_done = serializers.SerializerMethodField()

    class Meta:
        model = Sprint
        fields = ('id', 'name', 'goal', 'start_date', 'end_date', 'color', 'is_active',
                  'tasks_total', 'tasks_done', 'created_at', 'updated_at')
        read_only_fields = ('user', 'tasks_total', 'tasks_done', 'created_at', 'updated_at')

    def get_tasks_total(self, obj):
        return obj.user.tasks.filter(due_date__date__gte=obj.start_date, due_date__date__lte=obj.end_date).count()

    def get_tasks_done(self, obj):
        return obj.user.tasks.filter(
            due_date__date__gte=obj.start_date,
            due_date__date__lte=obj.end_date,
            status='DONE'
        ).count()
