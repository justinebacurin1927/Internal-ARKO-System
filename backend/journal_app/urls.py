from django.urls import path
from . import views

urlpatterns = [
    path('', views.JournalEntryViewSet.as_view({'get': 'list', 'post': 'create'}), name='journal_list'),
    path('<str:pk>/', views.JournalEntryViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}), name='journal_detail'),
]
