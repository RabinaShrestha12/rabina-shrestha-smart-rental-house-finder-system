from django.contrib.auth import authenticate, get_user_model
from django.db import IntegrityError
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


# ----------------- Helpers -----------------
def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}


def get_user_by_identifier(identifier: str):
    """
    identifier can be email OR username
    """
    if not identifier:
        return None
    user = User.objects.filter(email=identifier).first()
    if user:
        return user
    return User.objects.filter(username=identifier).first()


def validate_required_fields(data, fields):
    missing = [f for f in fields if not data.get(f)]
    if missing:
        return Response(
            {"err": f"Missing required fields: {', '.join(missing)}"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return None


# ----------------- Admin Registration (Only one admin allowed) -----------------
@api_view(["POST"])
@permission_classes([AllowAny])
def register_admin(request):
    try:
        data = request.data
        err = validate_required_fields(data, ["username", "email", "password"])
        if err:
            return err

        username = data.get("username").strip()
        email = data.get("email").strip().lower()
        password = str(data.get("password"))
        phone = data.get("phone")
        address = data.get("address")

        # Ensure only one admin exists
        if User.objects.filter(role="admin").exists():
            return Response(
                {"err": "An admin account already exists. Please login."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Prevent duplicates
        if User.objects.filter(username=username).exists():
            return Response({"err": "Username already exists."}, status=400)
        if User.objects.filter(email=email).exists():
            return Response({"err": "Email already exists."}, status=400)

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            phone=phone,
            address=address,
            role="admin",
        )

        return Response(
            {"msg": "Admin registered successfully. Please login to continue."},
            status=status.HTTP_201_CREATED,
        )

    except IntegrityError as e:
        return Response({"err": f"Database integrity error: {str(e)}"}, status=400)
    except Exception as e:
        return Response({"err": f"Failed to register admin: {str(e)}"}, status=400)


# ----------------- Admin Login (email OR username) -----------------
@api_view(["POST"])
@permission_classes([AllowAny])
def login_admin(request):
    try:
        data = request.data
        err = validate_required_fields(data, ["email", "password"])
        if err:
            return err

        identifier = data.get("email")  # frontend sends "email" field
        password = data.get("password")

        user = get_user_by_identifier(identifier)
        if not user:
            return Response({"err": "Invalid email/username or password."}, status=401)

        if user.role != "admin":
            return Response({"err": "This login is only for admin."}, status=403)

        # authenticate needs username
        user_auth = authenticate(username=user.username, password=password)
        if not user_auth:
            return Response({"err": "Invalid email/username or password."}, status=401)

        tokens = get_tokens_for_user(user_auth)

        return Response(
            {
                "msg": "Admin login successful.",
                "tokens": tokens,
                "user": {
                    "id": user_auth.id,
                    "username": user_auth.username,
                    "email": user_auth.email,
                    "role": user_auth.role,
                },
            },
            status=200,
        )

    except Exception as e:
        return Response({"err": f"Login failed: {str(e)}"}, status=400)


# ----------------- Tenant Registration -----------------
@api_view(["POST"])
@permission_classes([AllowAny])
def register_tenant(request):
    try:
        data = request.data
        err = validate_required_fields(data, ["username", "email", "password"])
        if err:
            return err

        username = data.get("username").strip()
        email = data.get("email").strip().lower()
        password = str(data.get("password"))
        phone = data.get("phone")
        address = data.get("address")

        if User.objects.filter(username=username).exists():
            return Response({"err": "Username already exists."}, status=400)
        if User.objects.filter(email=email).exists():
            return Response({"err": "Email already exists."}, status=400)

        User.objects.create_user(
            username=username,
            email=email,
            password=password,
            phone=phone,
            address=address,
            role="tenant",
        )

        return Response({"msg": "Tenant registered successfully."}, status=201)

    except Exception as e:
        return Response({"err": f"Failed to register tenant: {str(e)}"}, status=400)


# ----------------- Owner Registration (Admin only) -----------------
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@authentication_classes([JWTAuthentication])  # IMPORTANT for function views
def register_owner_by_admin(request):
    try:
        if getattr(request.user, "role", None) != "admin":
            return Response({"err": "Only an admin can register an owner."}, status=403)

        data = request.data
        err = validate_required_fields(data, ["username", "email", "password"])
        if err:
            return err

        username = data.get("username").strip()
        email = data.get("email").strip().lower()
        password = str(data.get("password"))
        phone = data.get("phone")
        address = data.get("address")

        if User.objects.filter(username=username).exists():
            return Response({"err": "Username already exists."}, status=400)
        if User.objects.filter(email=email).exists():
            return Response({"err": "Email already exists."}, status=400)

        User.objects.create_user(
            username=username,
            email=email,
            password=password,
            phone=phone,
            address=address,
            role="owner",
        )

        return Response({"msg": "Owner registered successfully by admin."}, status=201)

    except Exception as e:
        return Response({"err": f"Failed to register owner: {str(e)}"}, status=400)


# ----------------- Login for Owner/Tenant (email OR username) -----------------
@api_view(["POST"])
@permission_classes([AllowAny])
def login_user(request):
    try:
        data = request.data
        err = validate_required_fields(data, ["email", "password"])
        if err:
            return err

        identifier = data.get("email")  # frontend sends "email"
        password = data.get("password")

        user = get_user_by_identifier(identifier)
        if not user:
            return Response({"err": "Invalid email/username or password."}, status=401)

        if user.role not in ["owner", "tenant"]:
            return Response({"err": "This login is only for owner or tenant."}, status=403)

        user_auth = authenticate(username=user.username, password=password)
        if not user_auth:
            return Response({"err": "Invalid email/username or password."}, status=401)

        tokens = get_tokens_for_user(user_auth)

        return Response(
            {
                "msg": "Login successful.",
                "tokens": tokens,
                "user": {
                    "id": user_auth.id,
                    "username": user_auth.username,
                    "role": user_auth.role,
                    "email": user_auth.email,
                },
            },
            status=200,
        )

    except Exception as e:
        return Response({"err": f"Login failed: {str(e)}"}, status=400)


# ----------------- List all owners and tenants (Admin only) -----------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
@authentication_classes([JWTAuthentication])
def list_all_users(request):
    if getattr(request.user, "role", None) != "admin":
        return Response({"err": "Only admin can access this."}, status=403)

    users = User.objects.filter(role__in=["owner", "tenant"]).values(
        "id",
        "username",
        "email",
        "role",
        "phone",
        "address",
        "created_at",
        "last_login",
        "is_active",
    )
    return Response({"users": list(users)}, status=200)


# ----------------- List all tenants (Admin only) -----------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
@authentication_classes([JWTAuthentication])
def admin_list_tenants(request):
    if getattr(request.user, "role", None) != "admin":
        return Response({"err": "Only admin can access tenant details."}, status=403)

    tenants = User.objects.filter(role="tenant").values(
        "id",
        "username",
        "email",
        "phone",
        "address",
        "created_at",
        "last_login",
        "is_active",
        "role",
    )
    return Response({"tenants": list(tenants)}, status=200)


# ----------------- Tenant details by id (Admin only) -----------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
@authentication_classes([JWTAuthentication])
def admin_tenant_detail(request, tenant_id):
    if getattr(request.user, "role", None) != "admin":
        return Response({"err": "Only admin can access."}, status=403)

    tenant = User.objects.filter(id=tenant_id, role="tenant").first()
    if not tenant:
        return Response({"err": "Tenant not found."}, status=404)

    data = {
        "id": tenant.id,
        "username": tenant.username,
        "email": tenant.email,
        "phone": tenant.phone,
        "address": tenant.address,
        "created_at": tenant.created_at,
        "last_login": tenant.last_login,
        "is_active": tenant.is_active,
        "role": tenant.role,
    }
    return Response({"tenant": data}, status=200)


# ----------------- Get/Update/Delete User by id (Admin only) -----------------
@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
@authentication_classes([JWTAuthentication])
def user_detail_crud(request, user_id):
    if getattr(request.user, "role", None) != "admin":
        return Response({"err": "Only admin can access this."}, status=403)

    user = User.objects.filter(id=user_id, role__in=["tenant", "owner"]).first()
    if not user:
        return Response({"err": "User not found."}, status=404)

    if request.method == "GET":
        data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "phone": user.phone,
            "address": user.address,
            "created_at": user.created_at,
            "last_login": user.last_login,
            "is_active": user.is_active,
        }
        return Response({"user": data}, status=200)

    if request.method == "PUT":
        data = request.data
        user.username = data.get("username", user.username)
        user.email = data.get("email", user.email)
        user.phone = data.get("phone", user.phone)
        user.address = data.get("address", user.address)

        if "is_active" in data:
            user.is_active = data.get("is_active")

        user.save()
        return Response({"msg": "User updated successfully."}, status=200)

    # DELETE
    user.delete()
    return Response({"msg": "User deleted successfully."}, status=200)
