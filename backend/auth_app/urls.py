from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('me/', views.me, name='me'),
    path('change-password/', views.change_password, name='change_password'),
    path('bootstrap-admin/', views.bootstrap_admin, name='bootstrap_admin'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('users/', views.admin_list_users, name='admin_list_users'),
    path('users/create/', views.admin_create_user, name='admin_create_user'),
    path('users/<int:user_id>/', views.admin_update_user, name='admin_update_user'),
    path('users/<int:user_id>/delete/', views.admin_delete_user, name='admin_delete_user'),
]
