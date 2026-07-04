from django.urls import path, include
from . import views

urlpatterns = [
    path('', views.ResourceViewSet.as_view({'get': 'list', 'post': 'create'}), name='resource_list'),
    path('<str:pk>/', views.ResourceViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}), name='resource_detail'),
]
