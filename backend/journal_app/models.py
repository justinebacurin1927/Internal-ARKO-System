from django.db import models
from django.conf import settings


class JournalEntry(models.Model):
    """Private per-user journal entry."""
    MOOD_CHOICES = [
        ('GREAT', 'Great'), ('GOOD', 'Good'), ('NEUTRAL', 'Neutral'),
        ('ROUGH', 'Rough'), ('TOUGH', 'Tough'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='journal_entries')
    title = models.CharField(max_length=255)
    content = models.TextField(blank=True, null=True)
    mood = models.CharField(max_length=20, choices=MOOD_CHOICES, blank=True, null=True)
    date = models.DateField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'journal_entries'
        indexes = [
            models.Index(fields=['user', '-date']),
        ]
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.date} - {self.title}"
