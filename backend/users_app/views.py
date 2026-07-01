from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()

@api_view(['GET'])
def search(request):
    query = request.query_params.get('query', '')
    qs = User.objects.exclude(id=request.user.id)
    if query:
        qs = qs.filter(
            models.Q(name__icontains=query) | models.Q(email__icontains=query)
        )
    data = [{'id': u.id, 'name': u.name, 'email': u.email, 'image': u.image} for u in qs]
    return Response(data)
