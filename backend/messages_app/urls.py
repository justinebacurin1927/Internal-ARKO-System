from django.urls import path
from . import views

urlpatterns = [
    path('conversations/', views.ConversationListView.as_view(), name='msg-conversations'),
    path('conversations/create/', views.CreateConversationView.as_view(), name='msg-create-conv'),
    path('<str:conversation_id>/', views.MessageListView.as_view(), name='msg-messages'),
]
