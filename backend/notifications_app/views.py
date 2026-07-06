from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        page_size = int(request.query_params.get('page_size', 20))
        page = int(request.query_params.get('page', 1))

        qs = Notification.objects.filter(recipient=request.user)
        total = qs.count()
        start = (page - 1) * page_size
        end = start + page_size
        items = qs[start:end]

        serializer = NotificationSerializer(items, many=True)
        return Response({
            'results': serializer.data,
            'total': total,
            'page': page,
            'has_next': end < total,
        })


class NotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, recipient=request.user)
        except Notification.DoesNotExist:
            return Response({'detail': 'Notification not found'}, status=404)

        notification.read_at = timezone.now()
        notification.save(update_fields=['read_at'])
        return Response({'status': 'ok'})


class NotificationReadAllView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        Notification.objects.filter(recipient=request.user, read_at__isnull=True).update(
            read_at=timezone.now()
        )
        return Response({'status': 'ok'})


class UnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(recipient=request.user, read_at__isnull=True).count()
        return Response({'count': count})
