from django.urls import path, include
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

@api_view(['GET'])
@permission_classes([AllowAny])
def health(request):
    return JsonResponse({'status': 'ok'})

urlpatterns = [
    path('api/health/', health, name='health'),
    path('api/auth/', include('auth_app.urls')),
    path('api/tasks/', include('tasks_app.urls')),
    path('api/finance/', include('finance_app.urls')),
    path('api/messages/', include('messages_app.urls')),
    path('api/reminders/', include('reminders_app.urls')),
    path('api/notes/', include('notes_app.urls')),
    path('api/events/', include('events_app.urls')),
    path('api/users/', include('users_app.urls')),
]
