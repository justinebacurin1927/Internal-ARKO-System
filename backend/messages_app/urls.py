from django.urls import path
from . import views

urlpatterns = [
    path('conversations/', views.ConversationListView.as_view(), name='msg-conversations'),
    path('conversations/create/', views.CreateConversationView.as_view(), name='msg-create-conv'),
    path('item/<int:pk>/', views.MessageDetailView.as_view(), name='msg-detail'),
    path('<str:conversation_id>/', views.MessageListView.as_view(), name='msg-messages'),
]
