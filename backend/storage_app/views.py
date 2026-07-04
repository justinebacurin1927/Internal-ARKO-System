import os
import uuid
import mimetypes
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import FileAttachment
from .serializers import FileAttachmentSerializer

try:
    import boto3
except ImportError:
    boto3 = None


def _get_s3_client():
    """Return a boto3 S3 client configured from Django settings."""
    if boto3 is None:
        return None
    return boto3.client(
        's3',
        endpoint_url=settings.S3_ENDPOINT or None,
        region_name=settings.S3_REGION,
        aws_access_key_id=settings.S3_ACCESS_KEY_ID,
        aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
    )


MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
ALLOWED_MIME_PREFIXES = (
    'image/', 'video/', 'audio/', 'application/pdf',
    'text/', 'font/', 'model/',
)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_file(request):
    """Upload a file to S3 and save metadata in the database."""
    uploaded = request.FILES.get('file')
    if not uploaded:
        return Response({'detail': 'No file provided. Use multipart/form-data with field "file".'},
                        status=status.HTTP_400_BAD_REQUEST)

    # Size check
    if uploaded.size > MAX_FILE_SIZE:
        return Response({'detail': f'File too large. Maximum is {MAX_FILE_SIZE // (1024*1024)} MB.'},
                        status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)

    # Determine mime type
    mime_type, _ = mimetypes.guess_type(uploaded.name)
    mime_type = mime_type or uploaded.content_type or 'application/octet-stream'

    resource_type = request.data.get('resource_type', 'TASK')
    resource_id = request.data.get('resource_id', None)

    # Build S3 key
    ext = os.path.splitext(uploaded.name)[1]
    s3_key = f"uploads/{request.user.id}/{uuid.uuid4()}{ext}"

    # Upload to S3
    s3 = _get_s3_client()
    upload_to_s3 = s3 is not None and settings.S3_ENDPOINT

    if upload_to_s3:
        try:
            s3.upload_fileobj(
                uploaded,
                settings.S3_BUCKET,
                s3_key,
                ExtraArgs={'ContentType': mime_type},
            )
        except Exception as e:
            return Response({'detail': f'S3 upload failed: {str(e)}'},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    else:
        # Local fallback: store to filesystem under MEDIA_ROOT
        s3_key = s3_key.lstrip('/')
        local_dir = os.path.join(settings.MEDIA_ROOT, 'uploads', str(request.user.id))
        os.makedirs(local_dir, exist_ok=True)
        local_path = os.path.join(local_dir, f"{uuid.uuid4()}{ext}")
        with open(local_path, 'wb+') as f:
            for chunk in uploaded.chunks():
                f.write(chunk)
        s3_key = local_path

    # Save metadata
    attachment = FileAttachment.objects.create(
        user=request.user,
        resource_type=resource_type,
        resource_id=resource_id,
        file_key=s3_key,
        file_name=uploaded.name,
        file_size=uploaded.size,
        mime_type=mime_type,
    )

    serializer = FileAttachmentSerializer(attachment, context={'request': request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_file_metadata(request, file_id):
    """Return metadata for a single file."""
    try:
        attachment = FileAttachment.objects.get(pk=file_id)
    except FileAttachment.DoesNotExist:
        return Response({'detail': 'File not found'}, status=status.HTTP_404_NOT_FOUND)

    # Only owner or admin can access
    if attachment.user != request.user and not request.user.is_staff:
        return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    serializer = FileAttachmentSerializer(attachment, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_file(request, file_id):
    """Redirect to signed S3 URL or serve locally."""
    from django.http import HttpResponseRedirect, FileResponse, HttpResponseNotFound

    try:
        attachment = FileAttachment.objects.get(pk=file_id)
    except FileAttachment.DoesNotExist:
        return HttpResponseNotFound('File not found')

    if attachment.user != request.user and not request.user.is_staff:
        return HttpResponseNotFound('Permission denied')

    s3 = _get_s3_client()
    if s3 is not None and settings.S3_ENDPOINT:
        try:
            signed_url = s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': settings.S3_BUCKET, 'Key': attachment.file_key},
                ExpiresIn=3600,
            )
            return HttpResponseRedirect(signed_url)
        except Exception:
            return HttpResponseNotFound('Could not generate download URL')
    else:
        # Local file
        if os.path.exists(attachment.file_key):
            return FileResponse(open(attachment.file_key, 'rb'),
                                filename=attachment.file_name,
                                as_attachment=True)
        return HttpResponseNotFound('File not found on disk')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_files(request, resource_type, resource_id=None):
    """List files for a given resource type and optional resource ID."""
    qs = FileAttachment.objects.filter(user=request.user)
    if resource_type != 'all':
        qs = qs.filter(resource_type=resource_type)
    if resource_id:
        qs = qs.filter(resource_id=resource_id)
    qs = qs.order_by('-created_at')

    serializer = FileAttachmentSerializer(qs, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_file(request, file_id):
    """Delete a file from S3 and remove its metadata."""
    try:
        attachment = FileAttachment.objects.get(pk=file_id)
    except FileAttachment.DoesNotExist:
        return Response({'detail': 'File not found'}, status=status.HTTP_404_NOT_FOUND)

    if attachment.user != request.user and not request.user.is_staff:
        return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    s3 = _get_s3_client()
    if s3 is not None and settings.S3_ENDPOINT:
        try:
            s3.delete_object(Bucket=settings.S3_BUCKET, Key=attachment.file_key)
        except Exception:
            pass  # Non-fatal; still remove the DB record
    else:
        if os.path.exists(attachment.file_key):
            os.remove(attachment.file_key)

    attachment.delete()
    return Response({'detail': 'File deleted'}, status=status.HTTP_204_NO_CONTENT)
