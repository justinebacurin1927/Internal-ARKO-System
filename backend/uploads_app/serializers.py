from rest_framework import serializers
from .models import FileUpload


class FileUploadSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = FileUpload
        fields = ('id', 'filename', 'content_type', 'size', 'object_type', 'object_id',
                  'uploaded_by', 'url', 'created_at')
        read_only_fields = ('uploaded_by', 'url', 'created_at')

    def get_url(self, obj):
        request = self.context.get('request')
        if request and obj.file:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url if obj.file else None
