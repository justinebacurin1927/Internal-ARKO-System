from django.urls import path, include
from . import views

urlpatterns = [
    path('', views.IdeaViewSet.as_view({'get': 'list', 'post': 'create'}), name='idea_list'),
    path('<str:pk>/', views.IdeaViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}), name='idea_detail'),
    path('<str:idea_id>/spawn-task/', views.spawn_task, name='spawn_task'),
]
