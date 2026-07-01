from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User
from .serializers import RegisterSerializer, LoginSerializer, UserSerializer

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = User.objects.create_user(
        email=serializer.validated_data['email'],
        password=serializer.validated_data['password'],
        name=serializer.validated_data.get('name', serializer.validated_data['email'].split('@')[0]),
    )
    refresh = RefreshToken.for_user(user)
    user_ser = UserSerializer(user)
    return Response({
        'token': str(refresh.access_token),
        'refresh': str(refresh),
        'user': user_ser.data,
    }, status=status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = authenticate(
        email=serializer.validated_data['email'],
        password=serializer.validated_data['password'],
    )
    if not user:
        return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
    refresh = RefreshToken.for_user(user)
    user_ser = UserSerializer(user)
    return Response({
        'token': str(refresh.access_token),
        'refresh': str(refresh),
        'user': user_ser.data,
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)
