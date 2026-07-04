from django.db.models.signals import post_save
from django.dispatch import receiver
from comments_app.models import Comment
from tasks_app.models import Task
from .models import Notification


@receiver(post_save, sender=Comment)
def notify_comment(sender, instance, created, **kwargs):
    """Notify resource owner when someone else comments on their resource."""
    if not created:
        return

    # For task comments, notify the task assignee (if different from commenter)
    if instance.resource_type == 'TASK':
        from tasks_app.models import Task
        try:
            task = Task.objects.get(pk=instance.resource_id)
            if task.assignee and task.assignee != instance.user:
                Notification.create_for(
                    user=task.assignee,
                    notif_type='COMMENT',
                    title=f"New comment on \"{task.title}\"",
                    message=instance.content[:200],
                    link=f"/dashboard/tasks",
                )
        except Task.DoesNotExist:
            pass


@receiver(post_save, sender=Task)
def notify_task_assignment(sender, instance, created, **kwargs):
    """Notify user when a task is assigned to them."""
    if not instance.assignee:
        return

    # Track previous assignee to avoid duplicates on updates
    if not created:
        try:
            old = Task.objects.get(pk=instance.pk)
            if old.assignee_id == instance.assignee_id:
                return  # Assignee didn't change
        except Task.DoesNotExist:
            return

    Notification.create_for(
        user=instance.assignee,
        notif_type='TASK_ASSIGNED',
        title=f"New task: \"{instance.title}\"",
        message=f"Priority: {instance.priority}",
        link="/dashboard/tasks",
    )
