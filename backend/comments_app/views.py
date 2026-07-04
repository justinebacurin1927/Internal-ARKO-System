from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Comment
from .serializers import CommentSerializer


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def comment_list(request, resource_type, resource_id):
    """List comments for a resource, or add a new comment."""
    if request.method == 'GET':
        comments = Comment.objects.filter(
            resource_type=resource_type.upper(),
            resource_id=resource_id,
        ).select_related('user').order_by('created_at')
        serializer = CommentSerializer(comments, many=True)
        return Response(serializer.data)

    # POST: create comment
    content = request.data.get('content', '').strip()
    if not content:
        return Response({'detail': 'Content is required'}, status=status.HTTP_400_BAD_REQUEST)

    comment = Comment.objects.create(
        user=request.user,
        resource_type=resource_type.upper(),
        resource_id=resource_id,
        content=content,
    )
    serializer = CommentSerializer(comment)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def comment_detail(request, comment_id):
    """Edit or delete a comment."""
    try:
        comment = Comment.objects.get(pk=comment_id)
    except Comment.DoesNotExist:
        return Response({'detail': 'Comment not found'}, status=status.HTTP_404_NOT_FOUND)

    if comment.user != request.user and not request.user.is_staff:
        return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'DELETE':
        comment.delete()
        return Response({'detail': 'Comment deleted'}, status=status.HTTP_204_NO_CONTENT)

    # PATCH: edit comment
    content = request.data.get('content', '').strip()
    if not content:
        return Response({'detail': 'Content is required'}, status=status.HTTP_400_BAD_REQUEST)

    comment.content = content
    comment.edited = True
    comment.save(update_fields=['content', 'edited', 'updated_at'])
    serializer = CommentSerializer(comment)
    return Response(serializer.data)
