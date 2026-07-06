from django.db import models
from django.conf import settings


class FileUpload(models.Model):
    OBJECT_TYPES = [
        ('task', 'Task'),
        ('note', 'Note'),
        ('message', 'Message'),
    ]

    file = models.FileField(upload_to='uploads/%Y/%m/%d/')
    filename = models.CharField(max_length=500)
    content_type = models.CharField(max_length=200)
    size = models.IntegerField()
    object_type = models.CharField(max_length=50, choices=OBJECT_TYPES, db_index=True)
    object_id = models.IntegerField(null=True, blank=True, db_index=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='uploads')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'file_uploads'
        ordering = ['-created_at']

    def __str__(self):
        return self.filename
