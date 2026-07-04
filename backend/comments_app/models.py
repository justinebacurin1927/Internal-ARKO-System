from django.db import models
from django.conf import settings


class Comment(models.Model):
    """Generic comment attached to any resource type via content_type + object_id."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='comments')
    resource_type = models.CharField(max_length=50, db_index=True)  # e.g. 'TASK', 'NOTE', 'IDEA'
    resource_id = models.CharField(max_length=255, db_index=True)
    content = models.TextField()
    edited = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'comments'
        indexes = [
            models.Index(fields=['resource_type', 'resource_id']),
            models.Index(fields=['user']),
        ]

    def __str__(self):
        return f"Comment by {self.user_id} on {self.resource_type}:{self.resource_id}"
