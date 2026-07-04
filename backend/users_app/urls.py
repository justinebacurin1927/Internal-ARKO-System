from django.urls import path
from . import views

urlpatterns = [
    path('search/', views.search, name='user-search'),
    path('count/', views.count, name='user-count'),
]
