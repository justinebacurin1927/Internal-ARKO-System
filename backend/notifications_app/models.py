from django.db import models
from django.conf import settings


class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('mention', 'Mention'),
        ('assignment', 'Assignment'),
        ('comment', 'Comment'),
        ('task_created', 'Task Created'),
    ]

    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='acted_notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    task = models.ForeignKey('tasks_app.Task', on_delete=models.SET_NULL, null=True, blank=True)
    message = models.TextField()
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']

    @property
    def is_read(self):
        return self.read_at is not None

    def __str__(self):
        return f'{self.notification_type} for {self.recipient.email}'
