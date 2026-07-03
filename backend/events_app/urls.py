from django.urls import path
from . import views

urlpatterns = [
    path('', views.EventViewSet.as_view({'get': 'list', 'post': 'create'}), name='event-list'),
    path('<str:pk>/', views.EventViewSet.as_view({'patch': 'partial_update', 'delete': 'destroy'}), name='event-detail'),
    path('sprints/', views.SprintViewSet.as_view({'get': 'list', 'post': 'create'}), name='sprint-list'),
    path('sprints/<str:pk>/', views.SprintViewSet.as_view({'patch': 'partial_update', 'delete': 'destroy'}), name='sprint-detail'),
]
