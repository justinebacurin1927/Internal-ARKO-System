from django.urls import path
from . import views

urlpatterns = [
    path('<str:resource_type>/<str:resource_id>/', views.comment_list, name='comment_list'),
    path('item/<str:comment_id>/', views.comment_detail, name='comment_detail'),
]
