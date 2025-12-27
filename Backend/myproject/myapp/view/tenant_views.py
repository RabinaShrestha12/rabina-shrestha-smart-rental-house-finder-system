from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model, authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from ..models import Tenant
from ..serializers import TenantSerializer

User = get_user_model()

# Token generator for tenant
def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

# ---------------- TENANT REGISTRATION ----------------
@api_view(['POST'])
@permission_classes([AllowAny])
def tenant_register(request):
    try:
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')
        full_name = request.data.get('full_name')

        if not username or not email or not password or not full_name:
            return Response({'error': 'All fields are required'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, email=email, password=password, role='tenant')
        tenant_profile = Tenant.objects.create(user=user, full_name=full_name)

        serializer = TenantSerializer(tenant_profile)
        return Response({'message': 'Tenant registered successfully', 'tenant': serializer.data}, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({'error': 'Failed to register tenant', 'details': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------------- TENANT LOGIN ----------------
@api_view(['POST'])
@permission_classes([AllowAny])
def tenant_login(request):
    try:
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response({'error': 'Username and password required'}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(username=username, password=password)
        if user is None or user.role != 'tenant':
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        tokens = get_tokens_for_user(user)
        return Response({'message': 'Login successful', 'tokens': tokens}, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': 'Failed to login', 'details': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------------- GET TENANT PROFILE ----------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_tenant_profile(request):
    try:
        if request.user.role != 'tenant':
            return Response({'error': 'Permission denied. Tenant access required.'}, status=status.HTTP_403_FORBIDDEN)

        tenant_profile = Tenant.objects.get(user=request.user)
        serializer = TenantSerializer(tenant_profile)
        return Response({'tenant_profile': serializer.data}, status=status.HTTP_200_OK)

    except Tenant.DoesNotExist:
        return Response({'error': 'Tenant profile not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': 'Failed to fetch tenant profile', 'details': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------------- GET ALL TENANTS (Admin only) ----------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_tenants(request):
    try:
        if request.user.role != 'admin':
            return Response({'error': 'Permission denied. Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        tenants = Tenant.objects.select_related('user').all()
        serializer = TenantSerializer(tenants, many=True)
        return Response({'tenants': serializer.data}, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': 'Failed to fetch tenants', 'details': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
