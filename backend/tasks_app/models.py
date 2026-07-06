from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError


class Task(models.Model):
    STATUS_CHOICES = [('TODO', 'Todo'), ('IN_PROGRESS', 'In Progress'), ('REVIEW', 'Review'), ('DONE', 'Done')]
    PRIORITY_CHOICES = [('LOW', 'Low'), ('MEDIUM', 'Medium'), ('HIGH', 'High'), ('URGENT', 'Urgent')]

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='TODO')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='MEDIUM')
    assignee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    due_date = models.DateTimeField(null=True, blank=True)
    position = models.IntegerField(default=0)
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subtasks')
    depends_on = models.ManyToManyField('self', symmetrical=False, blank=True, related_name='blocked_by')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tasks'
        indexes = [
            models.Index(fields=['assignee']),
            models.Index(fields=['status']),
            models.Index(fields=['parent']),
        ]

    def clean(self):
        if self.pk:
            # Can't be its own parent
            if self.parent and self.parent.pk == self.pk:
                raise ValidationError({'parent': 'A task cannot be its own parent'})

            # Circular dependency check for parent (max depth 10)
            if self.parent:
                depth = 0
                p = self.parent
                while p:
                    depth += 1
                    if depth > 10:
                        raise ValidationError({'parent': 'Task hierarchy too deep (max 10 levels)'})
                    if p.pk == self.pk:
                        raise ValidationError({'parent': 'Circular parent reference detected'})
                    p = p.parent

            # Can't depend on itself
            if self.depends_on.filter(pk=self.pk).exists():
                raise ValidationError({'depends_on': 'A task cannot depend on itself'})

    def save(self, *args, **kwargs):
        # Track original assignee for notification signals
        if self.pk:
            try:
                old = Task.objects.get(pk=self.pk)
                self._original_assignee = old.assignee
            except Task.DoesNotExist:
                self._original_assignee = None
        else:
            self._original_assignee = None

        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class Comment(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='task_comments')
    content = models.TextField()
    edited = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'task_comments'
        ordering = ['created_at']

    def __str__(self):
        return f'Comment by {self.author.email} on {self.task.title}'
