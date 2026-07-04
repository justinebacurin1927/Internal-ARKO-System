from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Idea
from .serializers import IdeaSerializer
from tasks_app.models import Task
from tasks_app.serializers import TaskSerializer


class IdeaViewSet(viewsets.ModelViewSet):
    serializer_class = IdeaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Idea.objects.filter(user=self.request.user)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter.upper())
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def spawn_task(request, idea_id):
    """Convert an idea into a task. Links them in both directions."""
    try:
        idea = Idea.objects.get(pk=idea_id, user=request.user)
    except Idea.DoesNotExist:
        return Response({'detail': 'Idea not found'}, status=status.HTTP_404_NOT_FOUND)

    task = Task.objects.create(
        title=idea.title,
        description=idea.description,
        assignee=request.user,
        status='TODO',
    )

    idea.spawned_task_id = task.id
    idea.status = 'IN_PROGRESS'
    idea.save(update_fields=['spawned_task_id', 'status'])

    task_ser = TaskSerializer(task)
    return Response(task_ser.data, status=status.HTTP_201_CREATED)
