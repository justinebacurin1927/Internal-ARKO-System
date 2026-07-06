from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from .models import Task, Comment
from .serializers import (
    TaskSerializer,
    CommentSerializer,
    CommentCreateSerializer,
)


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


class CommentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, task_id):
        # Verify user is assigned to this task
        if not Task.objects.filter(pk=task_id, assignee=request.user).exists():
            return Response({'detail': 'Task not found'}, status=404)

        page_size = int(request.query_params.get('page_size', 20))
        page = int(request.query_params.get('page', 1))

        qs = Comment.objects.filter(task_id=task_id)
        total = qs.count()
        start = (page - 1) * page_size
        end = start + page_size
        items = qs[start:end]

        serializer = CommentSerializer(items, many=True, context={'request': request})
        return Response({
            'results': serializer.data,
            'total': total,
            'page': page,
            'has_next': end < total,
        })

    def post(self, request, task_id):
        try:
            Task.objects.get(pk=task_id, assignee=request.user)
        except Task.DoesNotExist:
            return Response({'detail': 'Task not found'}, status=404)

        serializer = CommentCreateSerializer(
            data=request.data,
            context={'request': request, 'task_id': task_id},
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        comment = serializer.save()
        out = CommentSerializer(comment, context={'request': request})
        return Response(out.data, status=201)


class CommentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            comment = Comment.objects.select_related('task').get(pk=pk)
        except Comment.DoesNotExist:
            return Response({'detail': 'Comment not found'}, status=404)

        # Verify user is assigned to this task
        if comment.task.assignee != request.user:
            return Response({'detail': 'Permission denied'}, status=403)

        if comment.author != request.user:
            return Response({'detail': 'Permission denied'}, status=403)

        # 15-minute edit window
        elapsed = timezone.now() - comment.created_at
        if elapsed.total_seconds() > 900:
            return Response({'detail': 'Edit window expired (15 minutes)'}, status=400)

        content = request.data.get('content')
        if not content or not content.strip():
            return Response({'detail': 'Content is required'}, status=400)

        comment.content = content
        comment.edited = True
        comment.save(update_fields=['content', 'edited', 'updated_at'])

        serializer = CommentSerializer(comment, context={'request': request})
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            comment = Comment.objects.select_related('task').get(pk=pk)
        except Comment.DoesNotExist:
            return Response({'detail': 'Comment not found'}, status=404)

        # Verify user is assigned to this task
        if comment.task.assignee != request.user:
            return Response({'detail': 'Permission denied'}, status=403)

        if comment.author != request.user:
            return Response({'detail': 'Permission denied'}, status=403)

        comment.delete()
        return Response(status=204)
