from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django.db import models
from .models import Resource
from .serializers import ResourceSerializer


class ResourceViewSet(viewsets.ModelViewSet):
    serializer_class = ResourceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Resource.objects.filter(user=self.request.user)
        # Filter by type
        rtype = self.request.query_params.get('type')
        if rtype:
            qs = qs.filter(resource_type=rtype.upper())
        # Search by title/tag
        q = self.request.query_params.get('q')
        if q:
            qs = qs.filter(
                models.Q(title__icontains=q) |
                models.Q(description__icontains=q) |
                models.Q(tags__contains=[q])
            )
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
