from django.db import models
from django.conf import settings

class Event(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    color = models.CharField(max_length=7, default='#2D6A4F')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='events')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'events'
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['date']),
        ]


class Sprint(models.Model):
    name = models.CharField(max_length=255)
    goal = models.TextField(blank=True, null=True)
    start_date = models.DateField()
    end_date = models.DateField()
    color = models.CharField(max_length=7, default='#2D6A4F')
    is_active = models.BooleanField(default=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sprints')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sprints'
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['start_date', 'end_date']),
        ]
