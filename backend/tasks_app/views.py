from rest_framework import viewsets
from .models import Task
from .serializers import TaskSerializer

class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer

    def get_queryset(self):
        return Task.objects.filter(assignee=self.request.user).order_by('position')

    def perform_create(self, serializer):
        assignee_id = self.request.data.get('assignee')
        if assignee_id:
            serializer.save(assignee_id=assignee_id)
        else:
            serializer.save(assignee=self.request.user)
