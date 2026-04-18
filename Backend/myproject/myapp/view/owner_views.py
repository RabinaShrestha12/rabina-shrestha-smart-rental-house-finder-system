from django.contrib.auth import authenticate, get_user_model
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from ..models import Owner
from ..serializers import OwnerSerializer

User = get_user_model()


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}


@api_view(["POST"])
@permission_classes([AllowAny])
def owner_register(request):
    data = request.data
    username = data.get("username")
    password = data.get("password")
    email = data.get("email")

    if not username or not password or not email:
        return Response(
            {"detail": "username, email and password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(username=username).exists():
        return Response(
            {"detail": "Username already exists."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(email=email).exists():
        return Response(
            {"detail": "Email already exists."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = User.objects.create_user(
        username=username,
        password=password,
        email=email,
    )

    if hasattr(user, "role"):
        user.role = "owner"
        user.save(update_fields=["role"])

    # Owner model in your shared code has user + location only
    Owner.objects.get_or_create(
        user=user,
        defaults={"location": ""},
    )

    tokens = get_tokens_for_user(user)
    return Response(
        {"detail": "Owner registered successfully.", "tokens": tokens},
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def owner_login(request):
    data = request.data
    username = data.get("username")
    password = data.get("password")

    user = authenticate(username=username, password=password)
    if user is None:
        return Response(
            {"detail": "Invalid username or password."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    is_owner_role = getattr(user, "role", None) == "owner"
    has_owner_profile = Owner.objects.filter(user=user).exists()

    if not is_owner_role and not has_owner_profile:
        return Response(
            {"detail": "This account is not an owner."},
            status=status.HTTP_403_FORBIDDEN,
        )

    tokens = get_tokens_for_user(user)
    return Response(
        {"detail": "Owner login success.", "tokens": tokens},
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_owner_profile(request):
    profile = Owner.objects.filter(user=request.user).first()
    if not profile:
        return Response(
            {"detail": "Owner profile not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(
        OwnerSerializer(profile).data,
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_all_owners(request):
    is_admin_role = getattr(request.user, "role", None) == "admin"
    if not request.user.is_staff and not is_admin_role:
        return Response(
            {"detail": "Admin only."},
            status=status.HTTP_403_FORBIDDEN,
        )

    owners = Owner.objects.all().order_by("-id")
    return Response(
        OwnerSerializer(owners, many=True).data,
        status=status.HTTP_200_OK,
    )