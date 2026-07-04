import uuid
from django.db import models
from django.conf import settings


class FileAttachment(models.Model):
    """Generic file attachment tied to any object via content_type + object_id."""
    RESOURCE_TYPE_CHOICES = [
        ('TASK', 'Task'),
        ('MESSAGE', 'Message'),
        ('NOTE', 'Note'),
        ('IDEA', 'Idea'),
        ('LIBRARY', 'Library'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='file_attachments')
    resource_type = models.CharField(max_length=20, choices=RESOURCE_TYPE_CHOICES)
    resource_id = models.CharField(max_length=255, blank=True, null=True)

    # S3 path & metadata
    file_key = models.CharField(max_length=500)
    file_name = models.CharField(max_length=255)
    file_size = models.IntegerField(default=0)
    mime_type = models.CharField(max_length=127, default='application/octet-stream')

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'file_attachments'
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['resource_type', 'resource_id']),
        ]

    def __str__(self):
        return f"{self.file_name} ({self.file_size} bytes)"
