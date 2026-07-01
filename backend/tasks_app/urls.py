from django.urls import path
from . import views

urlpatterns = [
    path('', views.TaskViewSet.as_view({'get': 'list', 'post': 'create'}), name='task-list'),
    path('<str:pk>/', views.TaskViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}), name='task-detail'),
]
