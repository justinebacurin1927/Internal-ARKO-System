from django.urls import path
from . import views

urlpatterns = [
    path('', views.TaskViewSet.as_view({'get': 'list', 'post': 'create'}), name='task-list'),
    path('<str:pk>/', views.TaskViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}), name='task-detail'),
    path('<int:task_id>/comments/', views.CommentListView.as_view(), name='comment-list'),
    path('comments/<int:pk>/', views.CommentDetailView.as_view(), name='comment-detail'),
]
