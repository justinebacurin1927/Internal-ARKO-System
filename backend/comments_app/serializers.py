from rest_framework import serializers
from .models import Comment


class CommentSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ('id', 'user', 'user_name', 'user_email', 'resource_type',
                  'resource_id', 'content', 'edited', 'created_at', 'updated_at')
        read_only_fields = ('id', 'user', 'user_name', 'user_email', 'edited', 'created_at', 'updated_at')

    def get_user_name(self, obj):
        return obj.user.name if obj.user else None

    def get_user_email(self, obj):
        return obj.user.email if obj.user else None
