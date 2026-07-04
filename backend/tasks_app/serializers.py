from rest_framework import serializers
from .models import Task, TaskDependency


class TaskDependencySerializer(serializers.ModelSerializer):
    depends_on_title = serializers.SerializerMethodField()
    depends_on_status = serializers.SerializerMethodField()

    class Meta:
        model = TaskDependency
        fields = ('id', 'task', 'depends_on', 'depends_on_title', 'depends_on_status', 'created_at')
        read_only_fields = ('depends_on_title', 'depends_on_status')

    def get_depends_on_title(self, obj):
        return obj.depends_on.title if obj.depends_on_id else None

    def get_depends_on_status(self, obj):
        return obj.depends_on.status if obj.depends_on_id else None


class SubtaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ('id', 'title', 'status', 'priority', 'position')
        read_only_fields = fields


class TaskSerializer(serializers.ModelSerializer):
    assignee_name = serializers.SerializerMethodField()
    assignee_email = serializers.SerializerMethodField()
    subtasks = SubtaskSerializer(many=True, read_only=True, source='subtasks.all')
    dependencies = TaskDependencySerializer(many=True, read_only=True)

    class Meta:
        model = Task
        fields = ('id', 'title', 'description', 'status', 'priority', 'assignee',
                  'assignee_name', 'assignee_email', 'parent', 'subtasks',
                  'dependencies', 'due_date', 'position', 'created_at', 'updated_at')
        read_only_fields = ('assignee_name', 'assignee_email', 'subtasks', 'dependencies')

    def get_assignee_name(self, obj):
        return obj.assignee.name if obj.assignee else None

    def get_assignee_email(self, obj):
        return obj.assignee.email if obj.assignee else None
