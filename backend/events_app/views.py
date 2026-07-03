from rest_framework import viewsets
from .models import Event, Sprint
from .serializers import EventSerializer, SprintSerializer

class EventViewSet(viewsets.ModelViewSet):
    serializer_class = EventSerializer

    def get_queryset(self):
        qs = Event.objects.filter(user=self.request.user).order_by('date', 'start_time')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class SprintViewSet(viewsets.ModelViewSet):
    serializer_class = SprintSerializer

    def get_queryset(self):
        qs = Sprint.objects.filter(user=self.request.user).order_by('-created_at')
        active_only = self.request.query_params.get('active')
        if active_only == 'true':
            qs = qs.filter(is_active=True)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
