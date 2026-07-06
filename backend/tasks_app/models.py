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
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subtasks')
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


class TaskDependency(models.Model):
    """task depends_on dependency: task cannot be started until dependency is DONE."""
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='dependencies')
    depends_on = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='blocked_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'task_dependencies'
        unique_together = ('task', 'depends_on')

    def __str__(self):
        return f"{self.task_id} depends on {self.depends_on_id}"
