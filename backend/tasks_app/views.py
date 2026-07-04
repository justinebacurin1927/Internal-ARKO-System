from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Task, TaskDependency
from .serializers import TaskSerializer, TaskDependencySerializer
from django.db.models import Q


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer

    def get_queryset(self):
        # Show tasks assigned to user OR where user has subtasks
        return Task.objects.filter(
            Q(assignee=self.request.user) | Q(subtasks__assignee=self.request.user)
        ).distinct().order_by('position')

    def perform_create(self, serializer):
        assignee_id = self.request.data.get('assignee')
        parent_id = self.request.data.get('parent')
        kwargs = {}
        if assignee_id:
            kwargs['assignee_id'] = assignee_id
        if parent_id:
            kwargs['parent_id'] = parent_id
        if not assignee_id:
            kwargs['assignee'] = self.request.user
        serializer.save(**kwargs)


# ── Dependency endpoints ──

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_dependency(request, task_id):
    """Add a dependency: task_id depends_on depends_on_id."""
    depends_on_id = request.data.get('depends_on_id')
    if not depends_on_id:
        return Response({'detail': 'depends_on_id required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        task = Task.objects.get(pk=task_id)
        depends_on = Task.objects.get(pk=depends_on_id)
    except Task.DoesNotExist:
        return Response({'detail': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)

    if task == depends_on:
        return Response({'detail': 'A task cannot depend on itself'}, status=status.HTTP_400_BAD_REQUEST)

    dep, created = TaskDependency.objects.get_or_create(task=task, depends_on=depends_on)
    if not created:
        return Response({'detail': 'Dependency already exists'}, status=status.HTTP_400_BAD_REQUEST)

    serializer = TaskDependencySerializer(dep)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_dependency(request, dep_id):
    """Remove a dependency."""
    try:
        dep = TaskDependency.objects.get(pk=dep_id)
    except TaskDependency.DoesNotExist:
        return Response({'detail': 'Dependency not found'}, status=status.HTTP_404_NOT_FOUND)
    dep.delete()
    return Response({'detail': 'Dependency removed'}, status=status.HTTP_204_NO_CONTENT)
