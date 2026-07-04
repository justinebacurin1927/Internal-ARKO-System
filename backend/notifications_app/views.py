from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Notification
from .serializers import NotificationSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_notifications(request):
    """List notifications for the current user, newest first."""
    qs = Notification.objects.filter(user=request.user).order_by('-created_at')
    serializer = NotificationSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def unread_count(request):
    """Return the count of unread notifications."""
    count = Notification.objects.filter(user=request.user, read=False).count()
    return Response({'count': count})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def mark_read(request, notif_id):
    """Mark a single notification as read."""
    try:
        notif = Notification.objects.get(pk=notif_id, user=request.user)
    except Notification.DoesNotExist:
        return Response({'detail': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)
    notif.read = True
    notif.save(update_fields=['read'])
    return Response({'detail': 'Marked as read'})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def mark_all_read(request):
    """Mark all unread notifications as read."""
    count = Notification.objects.filter(user=request.user, read=False).update(read=True)
    return Response({'detail': f'{count} notifications marked as read'})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_notification(request, notif_id):
    """Delete a notification."""
    try:
        notif = Notification.objects.get(pk=notif_id, user=request.user)
    except Notification.DoesNotExist:
        return Response({'detail': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)
    notif.delete()
    return Response({'detail': 'Notification deleted'}, status=status.HTTP_204_NO_CONTENT)
