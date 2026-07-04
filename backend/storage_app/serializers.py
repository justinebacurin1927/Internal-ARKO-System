from rest_framework import serializers
from .models import FileAttachment


class FileAttachmentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = FileAttachment
        fields = ('id', 'file_name', 'file_size', 'mime_type', 'resource_type',
                  'resource_id', 'url', 'created_at')
        read_only_fields = ('id', 'file_name', 'file_size', 'mime_type', 'url', 'created_at')

    def get_url(self, obj):
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(f'/api/storage/{obj.id}/download/')
        return None
