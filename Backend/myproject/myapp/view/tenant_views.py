from django.contrib.auth import authenticate, get_user_model
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from django.db import transaction

from ..models import Tenant
from ..serializers import TenantSerializer

User = get_user_model()


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}


@api_view(["POST"])
@permission_classes([AllowAny])
@transaction.atomic
def tenant_register(request):
    data = request.data
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    email = (data.get("email") or "").strip()
    phone = (data.get("phone") or "").strip()
    address = (data.get("address") or "").strip()
    location = (data.get("location") or "").strip()

    if not username or not password:
        return Response({"detail": "username and password are required."},
                        status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({"detail": "Username already exists."},
                        status=status.HTTP_400_BAD_REQUEST)

    if email and User.objects.filter(email=email).exists():
        return Response({"detail": "Email already exists."},
                        status=status.HTTP_400_BAD_REQUEST)

    # ✅ Create USER in your custom table (myapp_user)
    user = User.objects.create_user(
        username=username,
        password=password,
        email=email,
    )
    # ✅ Ensure role is tenant (your custom field)
    if hasattr(user, "role"):
        user.role = "tenant"
    if hasattr(user, "address"):
        user.address = address
    if hasattr(user, "phone"):
        user.phone = phone
    user.save()

    # ✅ Create TENANT row linked to this user (myapp_tenant)
    Tenant.objects.get_or_create(
        user=user,
        defaults={
            "phone": phone,
            "address": address,
            "location": location,
        },
    )

    tokens = get_tokens_for_user(user)
    return Response(
        {"detail": "Tenant registered successfully.", "tokens": tokens},
        status=status.HTTP_201_CREATED
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def tenant_login(request):
    data = request.data
    username = data.get("username")
    password = data.get("password")

    user = authenticate(username=username, password=password)
    if user is None:
        return Response({"detail": "Invalid username or password."},
                        status=status.HTTP_401_UNAUTHORIZED)

    # ✅ related_name is "tenant" in your model
    if not hasattr(user, "tenant"):
        return Response({"detail": "This account is not a tenant."},
                        status=status.HTTP_403_FORBIDDEN)

    tokens = get_tokens_for_user(user)
    return Response({"detail": "Tenant login success.", "tokens": tokens},
                    status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_tenant_profile(request):
    if not hasattr(request.user, "tenant"):
        return Response({"detail": "Tenant profile not found."},
                        status=status.HTTP_404_NOT_FOUND)

    profile = request.user.tenant
    return Response(TenantSerializer(profile).data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_all_tenants(request):
    if not request.user.is_staff:
        return Response({"detail": "Admin only."},
                        status=status.HTTP_403_FORBIDDEN)

    tenants = Tenant.objects.all().order_by("-id")
    return Response(TenantSerializer(tenants, many=True).data,
                    status=status.HTTP_200_OK)
