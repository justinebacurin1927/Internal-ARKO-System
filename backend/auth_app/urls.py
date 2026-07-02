from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('me/', views.me, name='me'),
    path('change-password/', views.change_password, name='change_password'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
