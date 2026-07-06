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

    def get_subtasks(self, obj):
        subtasks = obj.subtasks.all().only('id', 'title', 'status')
        return SimpleTaskSerializer(subtasks, many=True).data

    def get_depends_on_detail(self, obj):
        deps = obj.depends_on.all().only('id', 'title', 'status')
        return SimpleTaskSerializer(deps, many=True).data

    def get_subtask_progress(self, obj):
        subtasks = obj.subtasks.all()
        total = subtasks.count()
        if total == 0:
            return None
        done = subtasks.filter(status='DONE').count()
        return {'done': done, 'total': total}

    def get_blocked(self, obj):
        return obj.depends_on.exclude(status='DONE').exists()

    def get_comment_count(self, obj):
        return obj.comments.count()


class CommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_image = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ('id', 'task', 'author', 'author_name', 'author_image',
                  'content', 'edited', 'created_at', 'updated_at',
                  'is_owner', 'can_edit')
        read_only_fields = ('id', 'task', 'author', 'author_name', 'author_image',
                            'edited', 'created_at', 'updated_at', 'is_owner', 'can_edit')

    def get_author_name(self, obj):
        return obj.author.name if obj.author else 'Unknown'

    def get_author_image(self, obj):
        return obj.author.image

    def get_is_owner(self, obj):
        request = self.context.get('request')
        return request and request.user == obj.author

    def get_can_edit(self, obj):
        request = self.context.get('request')
        if not request or request.user != obj.author:
            return False
        elapsed = timezone.now() - obj.created_at
        return elapsed.total_seconds() < 900  # 15 minutes


class CommentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ('content',)

    def create(self, validated_data):
        validated_data['task_id'] = self.context['task_id']
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)
