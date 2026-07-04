from django.db import models
from django.conf import settings


class Idea(models.Model):
    STATUS_CHOICES = [
        ('IDEA', 'Idea'), ('PLANNING', 'Planning'),
        ('IN_PROGRESS', 'In Progress'), ('COMPLETED', 'Completed'),
        ('ARCHIVED', 'Archived'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ideas')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='IDEA')
    tags = models.JSONField(default=list, blank=True)  # List of tag strings
    spawned_task_id = models.IntegerField(null=True, blank=True)  # Linked task ID
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ideas'
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return self.title
