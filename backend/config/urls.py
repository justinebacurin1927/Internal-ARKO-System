from django.urls import path, include

urlpatterns = [
    path('api/auth/', include('auth_app.urls')),
    path('api/tasks/', include('tasks_app.urls')),
    path('api/finance/', include('finance_app.urls')),
    path('api/messages/', include('messages_app.urls')),
    path('api/reminders/', include('reminders_app.urls')),
    path('api/notes/', include('notes_app.urls')),
    path('api/users/', include('users_app.urls')),
]
