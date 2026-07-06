from django.urls import path
from . import views

urlpatterns = [
    path('', views.NotificationListView.as_view(), name='notification-list'),
    path('<int:pk>/read/', views.NotificationReadView.as_view(), name='notification-read'),
    path('read-all/', views.NotificationReadAllView.as_view(), name='notification-read-all'),
    path('unread-count/', views.UnreadCountView.as_view(), name='notification-unread-count'),
]
