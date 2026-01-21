from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from ..models import Tenant
from ..serializers import TenantSerializer


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}


@api_view(["POST"])
@permission_classes([AllowAny])
def tenant_register(request):
    data = request.data
    username = data.get("username")
    password = data.get("password")
    email = data.get("email")
    phone = data.get("phone")
    address = data.get("address")

    if not username or not password:
        return Response({"detail": "username and password are required."}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({"detail": "Username already exists."}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(username=username, password=password, email=email)
    Tenant.objects.create(user=user, phone=phone, address=address)

    tokens = get_tokens_for_user(user)
    return Response({"detail": "Tenant registered successfully.", "tokens": tokens}, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
def tenant_login(request):
    data = request.data
    username = data.get("username")
    password = data.get("password")

    user = authenticate(username=username, password=password)
    if user is None:
        return Response({"detail": "Invalid username or password."}, status=status.HTTP_401_UNAUTHORIZED)

    if not hasattr(user, "tenant_profile"):
        return Response({"detail": "This account is not a tenant."}, status=status.HTTP_403_FORBIDDEN)

    tokens = get_tokens_for_user(user)
    return Response({"detail": "Tenant login success.", "tokens": tokens}, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_tenant_profile(request):
    if not hasattr(request.user, "tenant_profile"):
        return Response({"detail": "Tenant profile not found."}, status=status.HTTP_404_NOT_FOUND)

    profile = request.user.tenant_profile
    return Response(TenantSerializer(profile).data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_all_tenants(request):
    if not request.user.is_staff:
        return Response({"detail": "Admin only."}, status=status.HTTP_403_FORBIDDEN)

    tenants = Tenant.objects.all().order_by("-id")
    return Response(TenantSerializer(tenants, many=True).data, status=status.HTTP_200_OK)
