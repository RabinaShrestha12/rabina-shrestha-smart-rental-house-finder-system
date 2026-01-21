<<<<<<< HEAD
from django.contrib.auth import get_user_model
=======
from django.contrib.auth import authenticate, get_user_model
>>>>>>> 5cb67aff8d4d7675492669dcf029e2b6a7f92276
from django.db import IntegrityError, transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

<<<<<<< HEAD
=======

>>>>>>> 5cb67aff8d4d7675492669dcf029e2b6a7f92276
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
<<<<<<< HEAD
            and (getattr(request.user, "role", None) == "admin" or request.user.is_staff or request.user.is_superuser)
        )


# -----------------------------
# HELPERS (EMAIL LOGIN)
# -----------------------------
def get_user_by_email(email):
    if not email:
        return None
    return User.objects.filter(email__iexact=email).first()


# OWNER/TENANT REGISTER  (PUBLIC)
=======
            and getattr(request.user, "role", None) == "admin"
        )


# OWNER/TENANT REGISTER 
>>>>>>> 5cb67aff8d4d7675492669dcf029e2b6a7f92276
@api_view(["POST"])
@permission_classes([AllowAny])
def register_user(request):
    data = request.data

<<<<<<< HEAD
    email = (data.get("email") or "").strip().lower()
=======
    username = data.get("username")
    email = data.get("email")
>>>>>>> 5cb67aff8d4d7675492669dcf029e2b6a7f92276
    password = data.get("password")
    role = data.get("role")  # owner/tenant ONLY
    address = data.get("address", "")
    phone = data.get("phone", "")

<<<<<<< HEAD
    # optional username (auto-generate if not given)
    username = (data.get("username") or "").strip()

    if not email or not password:
        return Response({"error": "email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

    # ✅ admin is NOT allowed here
    if role not in ["owner", "tenant"]:
        return Response({"error": "role must be owner/tenant"}, status=status.HTTP_400_BAD_REQUEST)

    # make username from email if not provided
    if not username:
        username = email.split("@")[0]

    # email unique
    if User.objects.filter(email__iexact=email).exists():
        return Response({"error": "Email already exists"}, status=status.HTTP_400_BAD_REQUEST)

    # username unique (if clash, add number)
    base_username = username
    i = 1
    while User.objects.filter(username=username).exists():
        username = f"{base_username}{i}"
        i += 1
=======
    if not username or not password:
        return Response({"error": "username and password are required"}, status=400)

    # ✅ admin is NOT allowed here
    if role not in ["owner", "tenant"]:
        return Response({"error": "role must be owner/tenant"}, status=400)
>>>>>>> 5cb67aff8d4d7675492669dcf029e2b6a7f92276

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
<<<<<<< HEAD
                "email": user.email,
=======
>>>>>>> 5cb67aff8d4d7675492669dcf029e2b6a7f92276
                "username": user.username,
            },
            status=status.HTTP_201_CREATED,
        )

    except IntegrityError:
<<<<<<< HEAD
        return Response({"error": "Username or email already exists"}, status=status.HTTP_400_BAD_REQUEST)


# OWNER/TENANT LOGIN (EMAIL + PASSWORD)
@api_view(["POST"])
@permission_classes([AllowAny])
def login_user(request):
    email = (request.data.get("email") or "").strip().lower()
    password = request.data.get("password")

    if not email or not password:
        return Response({"error": "email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

    user = get_user_by_email(email)

    if not user or not user.check_password(password):
        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

    # prevent admin login from user login endpoint
    if getattr(user, "role", None) == "admin" or user.is_staff or user.is_superuser:
        return Response({"error": "Use admin login endpoint"}, status=status.HTTP_403_FORBIDDEN)
=======
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
>>>>>>> 5cb67aff8d4d7675492669dcf029e2b6a7f92276

    tokens = get_tokens_for_user(user)

    return Response(
        {
            "message": "Login successful",
            "tokens": tokens,
            "role": user.role,
            "user_id": user.id,
<<<<<<< HEAD
            "email": user.email,
            "username": user.username,
        },
        status=status.HTTP_200_OK,
    )


#  ADMIN REGISTER (ONLY ONCE)  (OPTIONAL)
=======
            "username": user.username,
        },
        status=200,
    )


#  ADMIN REGISTER (ONLY ONCE)
>>>>>>> 5cb67aff8d4d7675492669dcf029e2b6a7f92276
@api_view(["POST"])
@permission_classes([AllowAny])  # so first admin can be created without token
def register_admin(request):
    data = request.data

<<<<<<< HEAD
    email = (data.get("email") or "").strip().lower()
=======
    username = data.get("username")
    email = data.get("email")
>>>>>>> 5cb67aff8d4d7675492669dcf029e2b6a7f92276
    password = data.get("password")
    address = data.get("address", "")
    phone = data.get("phone", "")

<<<<<<< HEAD
    # optional username
    username = (data.get("username") or "").strip()

    if not email or not password:
        return Response({"error": "email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

    if not username:
        username = email.split("@")[0]

    # email unique
    if User.objects.filter(email__iexact=email).exists():
        return Response({"error": "Email already exists"}, status=status.HTTP_400_BAD_REQUEST)

    # username unique
    base_username = username
    i = 1
    while User.objects.filter(username=username).exists():
        username = f"{base_username}{i}"
        i += 1
=======
    if not username or not password:
        return Response({"error": "username and password are required"}, status=400)
>>>>>>> 5cb67aff8d4d7675492669dcf029e2b6a7f92276

    try:
        # ✅ Prevent two admins if requests come together
        with transaction.atomic():
            if User.objects.select_for_update().filter(role="admin").exists():
<<<<<<< HEAD
                return Response({"error": "Admin already exists"}, status=status.HTTP_400_BAD_REQUEST)
=======
                return Response({"error": "Admin already exists"}, status=400)
>>>>>>> 5cb67aff8d4d7675492669dcf029e2b6a7f92276

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
<<<<<<< HEAD
            {
                "message": "Admin registered",
                "tokens": tokens,
                "user_id": admin.id,
                "role": admin.role,
                "email": admin.email,
                "username": admin.username,
            },
            status=status.HTTP_201_CREATED,
        )

    except IntegrityError:
        return Response({"error": "Username or email already exists"}, status=status.HTTP_400_BAD_REQUEST)


# ADMIN LOGIN (EMAIL + PASSWORD)
@api_view(["POST"])
@permission_classes([AllowAny])
def login_admin(request):
    email = (request.data.get("email") or "").strip().lower()
    password = request.data.get("password")

    if not email or not password:
        return Response({"error": "email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

    user = get_user_by_email(email)

    if not user or not user.check_password(password):
        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

    if getattr(user, "role", None) != "admin" and not user.is_staff and not user.is_superuser:
        return Response({"error": "Not an admin account"}, status=status.HTTP_403_FORBIDDEN)
=======
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
>>>>>>> 5cb67aff8d4d7675492669dcf029e2b6a7f92276

    tokens = get_tokens_for_user(user)

    return Response(
        {
            "message": "Admin login successful",
            "tokens": tokens,
            "role": user.role,
            "user_id": user.id,
<<<<<<< HEAD
            "email": user.email,
            "username": user.username,
        },
        status=status.HTTP_200_OK,
    )


# ADMIN: LIST ALL USERS (FIXED: add @api_view)
@api_view(["GET"])
=======
            "username": user.username,
        },
        status=200,
    )


#  ADMIN: LIST ALL USERS @api_view(["GET"])
>>>>>>> 5cb67aff8d4d7675492669dcf029e2b6a7f92276
@permission_classes([IsAdminRole])
def list_all_users(request):
    users = (
        User.objects.all()
        .values("id", "username", "email", "role", "address", "phone", "created_at")
    )
<<<<<<< HEAD
    return Response(list(users), status=status.HTTP_200_OK)
=======
    return Response(list(users), status=200)
>>>>>>> 5cb67aff8d4d7675492669dcf029e2b6a7f92276


# ADMIN: LIST OWNERS
@api_view(["GET"])
@permission_classes([IsAdminRole])
def list_owners(request):
    owners = (
        User.objects.filter(role="owner")
        .values("id", "username", "email", "role", "address", "phone", "created_at")
    )
<<<<<<< HEAD
    return Response(list(owners), status=status.HTTP_200_OK)


# ADMIN: LIST TENANTS (FIXED: add @api_view)
@api_view(["GET"])
=======
    return Response(list(owners), status=200)


# ADMIN: LIST TENANTS @api_view(["GET"])
>>>>>>> 5cb67aff8d4d7675492669dcf029e2b6a7f92276
@permission_classes([IsAdminRole])
def list_tenants(request):
    tenants = (
        User.objects.filter(role="tenant")
        .values("id", "username", "email", "role", "address", "phone", "created_at")
    )
<<<<<<< HEAD
    return Response(list(tenants), status=status.HTTP_200_OK)
=======
    return Response(list(tenants), status=200)
>>>>>>> 5cb67aff8d4d7675492669dcf029e2b6a7f92276


# ADMIN: USER DETAIL CRUD
@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAdminRole])
def user_detail_crud(request, user_id):
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
<<<<<<< HEAD
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
=======
        return Response({"error": "User not found"}, status=404)
>>>>>>> 5cb67aff8d4d7675492669dcf029e2b6a7f92276

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
<<<<<<< HEAD
            status=status.HTTP_200_OK,
=======
            status=200,
>>>>>>> 5cb67aff8d4d7675492669dcf029e2b6a7f92276
        )

    if request.method == "PUT":
        data = request.data

        # allow update basic fields
<<<<<<< HEAD
        if "email" in data:
            new_email = (data.get("email") or "").strip().lower()
            if new_email and User.objects.filter(email__iexact=new_email).exclude(id=user.id).exists():
                return Response({"error": "Email already exists"}, status=status.HTTP_400_BAD_REQUEST)
            if new_email:
                user.email = new_email

        user.address = data.get("address", user.address)

        # optional update role
        if "role" in data:
            new_role = data.get("role")
            if new_role not in ["owner", "tenant", "admin"]:
                return Response({"error": "role must be owner/tenant/admin"}, status=status.HTTP_400_BAD_REQUEST)
=======
        user.email = data.get("email", user.email)
        user.address = data.get("address", user.address)

        # optional update role (block changing admin role unless you want it)
        if "role" in data:
            new_role = data.get("role")
            if new_role not in ["owner", "tenant", "admin"]:
                return Response({"error": "role must be owner/tenant/admin"}, status=400)
>>>>>>> 5cb67aff8d4d7675492669dcf029e2b6a7f92276
            user.role = new_role

        if "phone" in data:
            user.phone = str(data.get("phone", user.phone))

        user.save()
<<<<<<< HEAD
        return Response({"message": "User updated"}, status=status.HTTP_200_OK)

    # DELETE
    if user.role == "admin":
        return Response({"error": "Admin user cannot be deleted"}, status=status.HTTP_403_FORBIDDEN)

    user.delete()
    return Response({"message": "User deleted"}, status=status.HTTP_200_OK)
=======
        return Response({"message": "User updated"}, status=200)

    # DELETE
    # Optional: prevent deleting the only admin
    if user.role == "admin":
        return Response({"error": "Admin user cannot be deleted"}, status=403)

    user.delete()
    return Response({"message": "User deleted"}, status=200)
>>>>>>> 5cb67aff8d4d7675492669dcf029e2b6a7f92276
