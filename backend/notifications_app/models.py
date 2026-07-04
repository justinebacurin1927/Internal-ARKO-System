from django.db import models
from django.conf import settings


class Notification(models.Model):
    NOTIF_TYPES = [
        ('TASK_ASSIGNED', 'Task Assigned'),
        ('COMMENT', 'New Comment'),
        ('MENTION', 'You were mentioned'),
        ('TASK_DONE', 'Dependency Completed'),
        ('MESSAGE', 'New Message'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    notif_type = models.CharField(max_length=50, choices=NOTIF_TYPES)
    title = models.CharField(max_length=255)
    message = models.TextField(blank=True, null=True)
    link = models.CharField(max_length=500, blank=True, null=True)  # Frontend route
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        indexes = [
            models.Index(fields=['user', 'read']),
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        return f"[{self.notif_type}] {self.title} → {self.user_id}"

    @classmethod
    def create_for(cls, user, notif_type, title, message=None, link=None):
        """Create a notification for a user. Convenience class method."""
        return cls.objects.create(
            user=user,
            notif_type=notif_type,
            title=title,
            message=message,
            link=link,
        )
