from django.urls import path
from . import views

urlpatterns = [
    path('', views.FileUploadView.as_view(), name='upload-list'),
    path('<int:pk>/', views.FileUploadDeleteView.as_view(), name='upload-delete'),
]
