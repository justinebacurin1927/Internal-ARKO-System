from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User
from .serializers import RegisterSerializer, AdminCreateUserSerializer, LoginSerializer, UserSerializer

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

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def me(request):
    if request.method == 'PATCH':
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    serializer = UserSerializer(request.user)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    old = request.data.get('old_password')
    new = request.data.get('new_password')
    if not old or not new:
        return Response({'detail': 'Both old_password and new_password are required'}, status=status.HTTP_400_BAD_REQUEST)
    if not request.user.check_password(old):
        return Response({'detail': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)
    if len(new) < 6:
        return Response({'detail': 'Password must be at least 6 characters'}, status=status.HTTP_400_BAD_REQUEST)
    request.user.set_password(new)
    request.user.save()
    return Response({'detail': 'Password changed'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bootstrap_admin(request):
    """Promote the requesting user to admin if no admin exists yet."""
    if User.objects.filter(is_staff=True).exists():
        return Response({'detail': 'An admin already exists'}, status=status.HTTP_400_BAD_REQUEST)
    request.user.is_staff = True
    request.user.is_superuser = True
    request.user.role = 'ADMIN'
    request.user.save()
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_list_users(request):
    """List all users (admin only)."""
    users = User.objects.all().order_by('-created_at')
    serializer = UserSerializer(users, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_create_user(request):
    """Create a user with full fields (admin only)."""
    serializer = AdminCreateUserSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    role = serializer.validated_data.get('role', 'USER')
    user = User.objects.create_user(
        email=serializer.validated_data['email'],
        password=serializer.validated_data['password'],
        name=serializer.validated_data.get('name', ''),
        phone=serializer.validated_data.get('phone', ''),
        title=serializer.validated_data.get('title', ''),
        role=role,
        status=serializer.validated_data.get('status', 'ACTIVE'),
        is_staff=role == 'ADMIN',
    )
    user_ser = UserSerializer(user)
    return Response(user_ser.data, status=status.HTTP_201_CREATED)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_update_user(request, user_id):
    """Update a user's details (admin only)."""
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    # Only allow certain fields to be updated by admin
    allowed = {'name', 'email', 'phone', 'title', 'role', 'status', 'is_active'}
    update_data = {k: v for k, v in request.data.items() if k in allowed}
    # Sync is_staff with role
    if 'role' in update_data:
        update_data['is_staff'] = update_data['role'] == 'ADMIN'

    serializer = UserSerializer(user, data=update_data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_delete_user(request, user_id):
    """Delete a user (admin only)."""
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    if user == request.user:
        return Response({'detail': 'Cannot delete yourself'}, status=status.HTTP_400_BAD_REQUEST)
    user.delete()
    return Response({'detail': 'User deleted'}, status=status.HTTP_204_NO_CONTENT)
