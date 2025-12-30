from django.contrib.auth import authenticate, get_user_model
from django.db import IntegrityError, transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


# JWT TOKENS
def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}


# PERMISSIONS
class IsAdminRole(BasePermission):
    """
    Allow access only to authenticated users whose role == 'admin'
    """
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) == "admin"
        )


# OWNER/TENANT REGISTER 
@api_view(["POST"])
@permission_classes([AllowAny])
def register_user(request):
    data = request.data

    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role")  # owner/tenant ONLY
    address = data.get("address", "")
    phone = data.get("phone", "")

    if not username or not password:
        return Response({"error": "username and password are required"}, status=400)

    # ✅ admin is NOT allowed here
    if role not in ["owner", "tenant"]:
        return Response({"error": "role must be owner/tenant"}, status=400)

    try:
        user = User.objects.create_user(username=username, email=email, password=password)
        user.role = role
        user.address = address
        user.phone = str(phone)
        user.save()

        tokens = get_tokens_for_user(user)

        return Response(
            {
                "message": "User registered",
                "tokens": tokens,
                "role": user.role,
                "user_id": user.id,
                "username": user.username,
            },
            status=status.HTTP_201_CREATED,
        )

    except IntegrityError:
        return Response({"error": "Username or email already exists"}, status=400)


# OWNER/TENANT LOGIN
@api_view(["POST"])
@permission_classes([AllowAny])
def login_user(request):
    username = request.data.get("username")
    password = request.data.get("password")

    if not username or not password:
        return Response({"error": "username and password are required"}, status=400)

    user = authenticate(username=username, password=password)

    if not user:
        return Response({"error": "Invalid credentials"}, status=401)

    # Optional: prevent admin login from user login endpoint
    if getattr(user, "role", None) == "admin":
        return Response({"error": "Use admin login endpoint"}, status=403)

    tokens = get_tokens_for_user(user)

    return Response(
        {
            "message": "Login successful",
            "tokens": tokens,
            "role": user.role,
            "user_id": user.id,
            "username": user.username,
        },
        status=200,
    )


#  ADMIN REGISTER (ONLY ONCE)
@api_view(["POST"])
@permission_classes([AllowAny])  # so first admin can be created without token
def register_admin(request):
    data = request.data

    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    address = data.get("address", "")
    phone = data.get("phone", "")

    if not username or not password:
        return Response({"error": "username and password are required"}, status=400)

    try:
        # ✅ Prevent two admins if requests come together
        with transaction.atomic():
            if User.objects.select_for_update().filter(role="admin").exists():
                return Response({"error": "Admin already exists"}, status=400)

            admin = User.objects.create_user(username=username, email=email, password=password)
            admin.role = "admin"
            admin.address = address
            admin.phone = str(phone)

            # Optional: make it Django admin capable
            admin.is_staff = True
            admin.is_superuser = True

            admin.save()

        tokens = get_tokens_for_user(admin)

        return Response(
            {"message": "Admin registered", "tokens": tokens, "user_id": admin.id, "role": admin.role},
            status=201,
        )

    except IntegrityError:
        return Response({"error": "Username or email already exists"}, status=400)


# ADMIN LOGIN
@api_view(["POST"])
@permission_classes([AllowAny])
def login_admin(request):
    username = request.data.get("username")
    password = request.data.get("password")

    if not username or not password:
        return Response({"error": "username and password are required"}, status=400)

    user = authenticate(username=username, password=password)

    if not user:
        return Response({"error": "Invalid credentials"}, status=401)

    if getattr(user, "role", None) != "admin":
        return Response({"error": "Not an admin account"}, status=403)

    tokens = get_tokens_for_user(user)

    return Response(
        {
            "message": "Admin login successful",
            "tokens": tokens,
            "role": user.role,
            "user_id": user.id,
            "username": user.username,
        },
        status=200,
    )


#  ADMIN: LIST ALL USERS @api_view(["GET"])
@permission_classes([IsAdminRole])
def list_all_users(request):
    users = (
        User.objects.all()
        .values("id", "username", "email", "role", "address", "phone", "created_at")
    )
    return Response(list(users), status=200)


# ADMIN: LIST OWNERS
@api_view(["GET"])
@permission_classes([IsAdminRole])
def list_owners(request):
    owners = (
        User.objects.filter(role="owner")
        .values("id", "username", "email", "role", "address", "phone", "created_at")
    )
    return Response(list(owners), status=200)


# ADMIN: LIST TENANTS @api_view(["GET"])
@permission_classes([IsAdminRole])
def list_tenants(request):
    tenants = (
        User.objects.filter(role="tenant")
        .values("id", "username", "email", "role", "address", "phone", "created_at")
    )
    return Response(list(tenants), status=200)


# ADMIN: USER DETAIL CRUD
@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAdminRole])
def user_detail_crud(request, user_id):
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

    if request.method == "GET":
        return Response(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "address": user.address,
                "phone": user.phone,
                "created_at": user.created_at,
            },
            status=200,
        )

    if request.method == "PUT":
        data = request.data

        # allow update basic fields
        user.email = data.get("email", user.email)
        user.address = data.get("address", user.address)

        # optional update role (block changing admin role unless you want it)
        if "role" in data:
            new_role = data.get("role")
            if new_role not in ["owner", "tenant", "admin"]:
                return Response({"error": "role must be owner/tenant/admin"}, status=400)
            user.role = new_role

        if "phone" in data:
            user.phone = str(data.get("phone", user.phone))

        user.save()
        return Response({"message": "User updated"}, status=200)

    # DELETE
    # Optional: prevent deleting the only admin
    if user.role == "admin":
        return Response({"error": "Admin user cannot be deleted"}, status=403)

    user.delete()
    return Response({"message": "User deleted"}, status=200)