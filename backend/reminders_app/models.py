from django.db import models
from django.conf import settings

class Reminder(models.Model):
    title = models.CharField(max_length=255)
    note = models.TextField(blank=True, null=True)
    due_at = models.DateTimeField()
    is_done = models.BooleanField(default=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reminders')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'reminders'
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['due_at']),
        ]
