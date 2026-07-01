from django.urls import path
from . import views

urlpatterns = [
    path('', views.ReminderViewSet.as_view({'get': 'list', 'post': 'create'}), name='reminder-list'),
    path('<str:pk>/', views.ReminderViewSet.as_view({'patch': 'partial_update', 'delete': 'destroy'}), name='reminder-detail'),
    path('<str:pk>/toggle/', views.ReminderViewSet.as_view({'patch': 'toggle'}), name='reminder-toggle'),
]
