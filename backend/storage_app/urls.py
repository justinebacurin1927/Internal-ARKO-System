from django.urls import path
from . import views

urlpatterns = [
    path('upload/', views.upload_file, name='upload_file'),
    path('<uuid:file_id>/', views.get_file_metadata, name='file_metadata'),
    path('<uuid:file_id>/download/', views.download_file, name='download_file'),
    path('list/<str:resource_type>/', views.list_files, name='list_files'),
    path('list/<str:resource_type>/<str:resource_id>/', views.list_files, name='list_files_for'),
    path('<uuid:file_id>/delete/', views.delete_file, name='delete_file'),
]
