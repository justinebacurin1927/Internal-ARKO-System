import re
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from django.db.models import Q

from .models import Notification


@receiver(post_save, sender='tasks_app.Comment')
def handle_comment_mentions(sender, instance, created, **kwargs):
    """Parse @mentions in comment content and create notifications."""
    if not created:
        return

    mentions = set(re.findall(r'@(\w[\w.-]+)', instance.content))
    if not mentions:
        return

    from django.contrib.auth import get_user_model
    User = get_user_model()

    mentioned_users = User.objects.filter(
        Q(name__in=mentions) | Q(email__in=mentions)
    ).exclude(id=instance.author.id)

    for user in mentioned_users:
        # Deduplicate: skip if identical notification in last 5 minutes
        five_min_ago = timezone.now() - timezone.timedelta(minutes=5)
        exists = Notification.objects.filter(
            recipient=user,
            notification_type='mention',
            actor=instance.author,
            task=instance.task,
            created_at__gte=five_min_ago,
        ).exists()
        if not exists:
            Notification.objects.create(
                recipient=user,
                actor=instance.author,
                notification_type='mention',
                task=instance.task,
                message=f'{instance.author.name or instance.author.email} mentioned you in a comment',
            )


@receiver(post_save, sender='tasks_app.Task')
def handle_task_assignment(sender, instance, created, **kwargs):
    """Create notification when task is assigned to someone."""
    if not instance.assignee:
        return

    # On creation with assignee
    if created:
        Notification.objects.create(
            recipient=instance.assignee,
            actor=instance.assignee,
            notification_type='task_created',
            task=instance,
            message=f'You were assigned: {instance.title}',
        )
        return

    # On update — check if assignee changed (tracked in instance._original_assignee)
    original = getattr(instance, '_original_assignee', None)
    if original and original != instance.assignee:
        Notification.objects.create(
            recipient=instance.assignee,
            actor=instance.assignee,
            notification_type='assignment',
            task=instance,
            message=f'You were assigned: {instance.title}',
        )
