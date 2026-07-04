from rest_framework import serializers
from .models import Resource


class ResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resource
        fields = ('id', 'title', 'url', 'resource_type', 'description',
                  'tags', 'file_id', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')
