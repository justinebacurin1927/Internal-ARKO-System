from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.conf import settings

from .models import FileUpload
from .serializers import FileUploadSerializer


ALLOWED_CONTENT_TYPES = {
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv',
}


class FileUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'detail': 'No file provided'}, status=400)

        max_size = getattr(settings, 'MAX_UPLOAD_SIZE', 10 * 1024 * 1024)
        if file_obj.size > max_size:
            return Response({'detail': f'File too large. Max {max_size // (1024*1024)}MB'}, status=400)

        if file_obj.content_type not in ALLOWED_CONTENT_TYPES:
            return Response({'detail': 'File type not allowed'}, status=400)

        upload = FileUpload(
            file=file_obj,
            filename=file_obj.name,
            content_type=file_obj.content_type,
            size=file_obj.size,
            object_type=request.data.get('object_type'),
            object_id=request.data.get('object_id'),
            uploaded_by=request.user,
        )
        upload.save()

        serializer = FileUploadSerializer(upload, context={'request': request})
        return Response(serializer.data, status=201)

    def get(self, request):
        object_type = request.query_params.get('object_type')
        object_id = request.query_params.get('object_id')
        if not object_type or not object_id:
            return Response({'detail': 'object_type and object_id query params required'}, status=400)

        files = FileUpload.objects.filter(object_type=object_type, object_id=object_id)
        serializer = FileUploadSerializer(files, many=True, context={'request': request})
        return Response(serializer.data)


class FileUploadDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            upload = FileUpload.objects.get(pk=pk)
        except FileUpload.DoesNotExist:
            return Response({'detail': 'File not found'}, status=404)

        if upload.uploaded_by != request.user and not request.user.role == 'ADMIN':
            return Response({'detail': 'Permission denied'}, status=403)

        upload.file.delete(save=False)
        upload.delete()
        return Response(status=204)
