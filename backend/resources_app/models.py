from django.db import models
from django.conf import settings


class Resource(models.Model):
    TYPE_CHOICES = [
        ('LINK', 'Link'),
        ('FILE', 'File'),
        ('DOC', 'Document'),
        ('REF', 'Reference'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='resources')
    title = models.CharField(max_length=255)
    url = models.URLField(max_length=1000, blank=True, null=True)
    resource_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='LINK')
    description = models.TextField(blank=True, null=True)
    tags = models.JSONField(default=list, blank=True)
    # Optional: linked to a file attachment
    file_id = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'resources'
        indexes = [
            models.Index(fields=['user', 'resource_type']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return self.title
