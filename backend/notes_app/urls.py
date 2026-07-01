from django.urls import path
from . import views

urlpatterns = [
    path('', views.NoteViewSet.as_view({'get': 'list', 'post': 'create'}), name='note-list'),
    path('<str:pk>/', views.NoteViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}), name='note-detail'),
]
