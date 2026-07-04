from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_notifications, name='list_notifications'),
    path('unread/', views.unread_count, name='unread_count'),
    path('<str:notif_id>/read/', views.mark_read, name='mark_read'),
    path('mark-all-read/', views.mark_all_read, name='mark_all_read'),
    path('<str:notif_id>/delete/', views.delete_notification, name='delete_notification'),
]
