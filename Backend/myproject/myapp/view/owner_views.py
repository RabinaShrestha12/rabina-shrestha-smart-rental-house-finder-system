from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model, authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from ..models import Owner
from ..serializers import OwnerSerializer

User = get_user_model()

# Token generator for owner
def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

# OWNER REGISTRATION
@api_view(['POST'])
@permission_classes([AllowAny])
def owner_register(request):
    try:
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')
        full_name = request.data.get('full_name')

        if not username or not email or not password or not full_name:
            return Response({'error': 'All fields are required'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, email=email, password=password, role='owner')
        owner_profile = Owner.objects.create(user=user, full_name=full_name)

        serializer = OwnerSerializer(owner_profile)
        return Response({'message': 'Owner registered successfully', 'owner': serializer.data}, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({'error': 'Failed to register owner', 'details': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# OWNER LOGIN
@api_view(['POST'])
@permission_classes([AllowAny])
def owner_login(request):
    try:
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response({'error': 'Username and password required'}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(username=username, password=password)
        if user is None or user.role != 'owner':
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        tokens = get_tokens_for_user(user)
        return Response({'message': 'Login successful', 'tokens': tokens}, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': 'Failed to login', 'details': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# GET OWNER PROFILE
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_owner_profile(request):
    try:
        if request.user.role != 'owner':
            return Response({'error': 'Permission denied. Owner access required.'}, status=status.HTTP_403_FORBIDDEN)

        owner_profile = Owner.objects.get(user=request.user)
        serializer = OwnerSerializer(owner_profile)
        return Response({'owner_profile': serializer.data}, status=status.HTTP_200_OK)

    except Owner.DoesNotExist:
        return Response({'error': 'Owner profile not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': 'Failed to fetch owner profile', 'details': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Get owner details by admin
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_owners(request):
    try:
        if request.user.role != 'admin':
            return Response({'error': 'Permission denied. Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        owners = Owner.objects.select_related('user').all()
        serializer = OwnerSerializer(owners, many=True)
        return Response({'owners': serializer.data}, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': 'Failed to fetch owners', 'details': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
