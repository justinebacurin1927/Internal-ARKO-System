from rest_framework import serializers
from .models import JournalEntry


class JournalEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = JournalEntry
        fields = ('id', 'title', 'content', 'mood', 'date', 'created_at', 'updated_at')
        read_only_fields = ('id', 'date', 'created_at', 'updated_at')
