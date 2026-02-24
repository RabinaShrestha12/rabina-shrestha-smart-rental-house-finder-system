# myapp/view/auth_views.py

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, BasePermission
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from django.contrib.auth.hashers import make_password, check_password
from datetime import timedelta
import random

from ..models import PendingSignup, PendingSignupOTP, Tenant, Owner, ServiceProviderProfile

User = get_user_model()

ALLOWED_ROLES = ["owner", "tenant", "provider"]


# ✅ IMPORTANT: normalize role from frontend
# Accepts: service_provider / service provider / service-provider
# Stores: provider
def normalize_role(role_value: str) -> str:
    r = (role_value or "").strip().lower()
    if r in ["service_provider", "service provider", "service-provider", "serviceprovider"]:
        return "provider"
    return r


# =========================
# JWT TOKENS
# =========================
def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}


# =========================
# PERMISSIONS
# =========================
class IsAdminRole(BasePermission):
    """
    Allow access only to authenticated users whose role == 'admin'
    """
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                getattr(request.user, "role", None) == "admin"
                or request.user.is_staff
                or request.user.is_superuser
            )
        )


# =========================
# HELPERS
# =========================
def get_user_by_email(email):
    if not email:
        return None
    return User.objects.filter(email__iexact=email).first()


def generate_otp_code():
    return str(random.randint(100000, 999999))


def send_otp_email(to_email, code):
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None) or getattr(settings, "EMAIL_HOST_USER", None)
    if not from_email:
        raise Exception("DEFAULT_FROM_EMAIL or EMAIL_HOST_USER not configured")

    send_mail(
        subject="Smart Rental House Finder - Signup OTP",
        message=f"Your signup OTP code is: {code}\n\n(Enter this code once to verify your email.)",
        from_email=from_email,
        recipient_list=[to_email],
        fail_silently=False,
    )


def ensure_role_profile(user):
    """
    ✅ Create Tenant/Owner/Provider profile row linked to the user (if missing).
    IMPORTANT:
    - address/phone are stored in User model
    - Tenant/Owner only have: user + location
    """
    role = getattr(user, "role", None)

    if role == "tenant":
        Tenant.objects.get_or_create(user=user, defaults={"location": ""})

    elif role == "owner":
        Owner.objects.get_or_create(user=user, defaults={"location": ""})

    elif role == "provider":
        ServiceProviderProfile.objects.get_or_create(
            user=user,
            defaults={
                "category": "other",
                "service_area": "",
                "phone": getattr(user, "phone", "") or "",
                "availability": "available",
                "bio": "",
            },
        )
    # admin: no profile table needed


def _create_or_reuse_pending(email, username, role, password_hash, address="", phone=""):
    """
    Ensures a PendingSignup exists for the email (not used). If exists, reuse latest.
    """
    pending = (
        PendingSignup.objects.filter(email__iexact=email, is_used=False)
        .order_by("-created_at")
        .first()
    )
    if pending:
        return pending

    return PendingSignup.objects.create(
        email=email,
        username=username,
        role=role,
        password_hash=password_hash,
        address=address or "",
        phone=str(phone or ""),
        expires_at=timezone.now() + timedelta(days=3650),
        is_used=False,
    )


def _issue_and_send_signup_otp(pending, email):
    """
    Create a new OTP row and email it.
    """
    code = generate_otp_code()
    PendingSignupOTP.objects.create(
        pending=pending,
        purpose="signup",
        code_hash=make_password(code),
        expires_at=timezone.now() + timedelta(days=3650),  # your original "no expiry" behavior
        is_used=False,
    )
    send_otp_email(email, code)


# =========================
# REGISTER (creates PendingSignup + OTP, sends email)
# =========================
@api_view(["POST"])
@permission_classes([AllowAny])
def register_user(request):
    data = request.data

    email = (data.get("email") or "").strip().lower()
    password = data.get("password")

    # ✅ FIX: normalize role so service_provider becomes provider
    role = normalize_role(data.get("role"))

    address = data.get("address", "")
    phone = data.get("phone", "")

    username = (data.get("username") or "").strip()
    if not username and email:
        username = email.split("@")[0]

    if not email or not password:
        return Response({"error": "email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

    if role not in ALLOWED_ROLES:
        return Response({"error": "role must be owner/tenant/provider"}, status=status.HTTP_400_BAD_REQUEST)

    # ✅ MAKE USERNAME UNIQUE against real users + pending signups
    base_username = username or "user"
    i = 1
    while (
        User.objects.filter(username=username).exists()
        or PendingSignup.objects.filter(username=username, is_used=False).exists()
    ):
        username = f"{base_username}{i}"
        i += 1

    # ==========================================================
    # ✅ IMPORTANT FIX:
    # If a REAL user exists:
    # - If NOT verified -> resend OTP (DO NOT return 400)
    # - If verified -> return 400 "login"
    # ==========================================================
    existing_user = User.objects.filter(email__iexact=email).first()
    if existing_user:
        is_verified = getattr(existing_user, "is_email_verified", False)

        if not is_verified:
            try:
                # create/reuse pending for this email
                existing_role = normalize_role(getattr(existing_user, "role", role))
                pending = _create_or_reuse_pending(
                    email=email,
                    username=existing_user.username or username,
                    role=existing_role if existing_role in ALLOWED_ROLES else role,
                    password_hash=existing_user.password,  # already hashed
                    address=getattr(existing_user, "address", "") or "",
                    phone=getattr(existing_user, "phone", "") or "",
                )
                _issue_and_send_signup_otp(pending, email)
                return Response(
                    {"message": "OTP resent. Please verify OTP once.", "email": email},
                    status=status.HTTP_200_OK,
                )
            except Exception as e:
                return Response({"error": f"OTP send failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"error": "Email already exists. Please login."}, status=status.HTTP_400_BAD_REQUEST)

    # ✅ If pending signup exists -> resend OTP (latest)
    existing_pending = PendingSignup.objects.filter(email__iexact=email, is_used=False).order_by("-created_at").first()
    if existing_pending:
        try:
            _issue_and_send_signup_otp(existing_pending, email)
            return Response(
                {"message": "OTP resent. Please verify OTP once.", "email": email},
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response({"error": f"OTP send failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # ✅ Create NEW pending + OTP
    try:
        pending = PendingSignup.objects.create(
            email=email,
            username=username,
            role=role,
            password_hash=make_password(password),
            address=address,
            phone=str(phone),
            expires_at=timezone.now() + timedelta(days=3650),
            is_used=False,
        )

        _issue_and_send_signup_otp(pending, email)

        return Response(
            {"message": "OTP sent to email. Verify once to activate account.", "email": email, "role": role},
            status=status.HTTP_201_CREATED,
        )

    except IntegrityError:
        return Response({"error": "Signup failed. Try again."}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": f"OTP send failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =========================
# VERIFY OTP (creates real User) + creates role profile row
# =========================
@api_view(["POST"])
@permission_classes([AllowAny])
def verify_otp(request):
    email = (request.data.get("email") or "").strip().lower()
    code = (request.data.get("code") or "").strip()
    purpose = (request.data.get("purpose") or "signup").strip()

    if not email or not code:
        return Response({"error": "email and code are required"}, status=status.HTTP_400_BAD_REQUEST)

    pending = PendingSignup.objects.filter(email__iexact=email, is_used=False).order_by("-created_at").first()
    if not pending:
        return Response({"error": "No pending signup found. Please register again."}, status=status.HTTP_400_BAD_REQUEST)

    otp = PendingSignupOTP.objects.filter(
        pending=pending,
        purpose=purpose,
        is_used=False
    ).order_by("-created_at").first()

    if not otp:
        return Response({"error": "OTP not found. Please resend OTP."}, status=status.HTTP_400_BAD_REQUEST)

    if otp.attempts >= 5:
        otp.is_used = True
        otp.save(update_fields=["is_used"])
        return Response({"error": "Too many attempts. Please resend OTP."}, status=status.HTTP_400_BAD_REQUEST)

    ok = check_password(code, otp.code_hash)

    otp.attempts += 1
    otp.save(update_fields=["attempts"])

    if not ok:
        return Response({"error": "Invalid OTP"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            # if user already exists (race condition)
            if User.objects.filter(email__iexact=email).exists():
                return Response({"error": "User already exists. Please login."}, status=status.HTTP_400_BAD_REQUEST)

            user = User.objects.create_user(
                username=pending.username,
                email=pending.email,
                password=None,
            )

            user.password = pending.password_hash
            user.role = normalize_role(pending.role)  # ✅ safety
            user.address = pending.address
            user.phone = pending.phone
            user.is_email_verified = True
            user.save()

            ensure_role_profile(user)

            otp.is_used = True
            otp.save(update_fields=["is_used"])

            pending.is_used = True
            pending.save(update_fields=["is_used"])

        tokens = get_tokens_for_user(user)
        return Response(
            {
                "message": "OTP verified. Account activated. You can login anytime now.",
                "access": tokens["access"],
                "refresh": tokens["refresh"],
                "tokens": tokens,
                "role": user.role,
                "user_id": user.id,
                "email": user.email,
                "username": user.username,
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        return Response({"error": f"Account creation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =========================
# LOGIN (ALL ROLES) - email + password
# =========================
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

    if getattr(user, "role", None) in ALLOWED_ROLES and getattr(user, "is_email_verified", False) is False:
        return Response({"error": "Email not verified. Please verify signup OTP first."}, status=status.HTTP_403_FORBIDDEN)

    ensure_role_profile(user)

    tokens = get_tokens_for_user(user)

    return Response(
        {
            "message": "Login successful",
            "access": tokens["access"],
            "refresh": tokens["refresh"],
            "tokens": tokens,
            "role": user.role,
            "user_id": user.id,
            "email": user.email,
            "username": user.username,
        },
        status=status.HTTP_200_OK,
    )


# =========================
# ADMIN REGISTER (ONLY ONCE)
# =========================
@api_view(["POST"])
@permission_classes([AllowAny])
def register_admin(request):
    data = request.data

    email = (data.get("email") or "").strip().lower()
    password = data.get("password")
    address = data.get("address", "")
    phone = data.get("phone", "")

    username = (data.get("username") or "").strip()
    if not email or not password:
        return Response({"error": "email and password are required"}, status=status.HTTP_400_BAD_REQUEST)
    if not username:
        username = email.split("@")[0]

    if User.objects.filter(email__iexact=email).exists():
        return Response({"error": "Email already exists"}, status=status.HTTP_400_BAD_REQUEST)

    base_username = username
    i = 1
    while User.objects.filter(username=username).exists():
        username = f"{base_username}{i}"
        i += 1

    try:
        with transaction.atomic():
            if User.objects.select_for_update().filter(role="admin").exists():
                return Response({"error": "Admin already exists"}, status=status.HTTP_400_BAD_REQUEST)

            admin = User.objects.create_user(username=username, email=email, password=password)
            admin.role = "admin"
            admin.address = address
            admin.phone = str(phone)
            admin.is_staff = True
            admin.is_superuser = True
            admin.is_email_verified = True
            admin.save()

        tokens = get_tokens_for_user(admin)

        return Response(
            {
                "message": "Admin registered",
                "access": tokens["access"],
                "refresh": tokens["refresh"],
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


# =========================
# ADMIN LOGIN (Optional)
# =========================
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

    tokens = get_tokens_for_user(user)

    return Response(
        {
            "message": "Admin login successful",
            "access": tokens["access"],
            "refresh": tokens["refresh"],
            "tokens": tokens,
            "role": user.role,
            "user_id": user.id,
            "email": user.email,
            "username": user.username,
        },
        status=status.HTTP_200_OK,
    )


# =========================
# ADMIN: LIST USERS
# =========================
@api_view(["GET"])
@permission_classes([IsAdminRole])
def list_all_users(request):
    users = User.objects.all().values("id", "username", "email", "role", "address", "phone", "created_at")
    return Response(list(users), status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAdminRole])
def list_owners(request):
    owners = User.objects.filter(role="owner").values("id", "username", "email", "role", "address", "phone", "created_at")
    return Response(list(owners), status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAdminRole])
def list_tenants(request):
    tenants = User.objects.filter(role="tenant").values("id", "username", "email", "role", "address", "phone", "created_at")
    return Response(list(tenants), status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAdminRole])
def list_providers(request):
    providers = User.objects.filter(role="provider").values("id", "username", "email", "role", "address", "phone", "created_at")
    return Response(list(providers), status=status.HTTP_200_OK)


# =========================
# ADMIN: USER DETAIL CRUD
# =========================
@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAdminRole])
def user_detail_crud(request, user_id):
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

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
            status=status.HTTP_200_OK,
        )

    if request.method == "PUT":
        data = request.data

        if "email" in data:
            new_email = (data.get("email") or "").strip().lower()
            if new_email and User.objects.filter(email__iexact=new_email).exclude(id=user.id).exists():
                return Response({"error": "Email already exists"}, status=status.HTTP_400_BAD_REQUEST)
            if new_email:
                user.email = new_email

        user.address = data.get("address", user.address)

        if "role" in data:
            new_role = normalize_role(data.get("role"))  # ✅ FIX
            if new_role not in ["owner", "tenant", "admin", "provider"]:
                return Response({"error": "role must be owner/tenant/admin/provider"}, status=status.HTTP_400_BAD_REQUEST)
            user.role = new_role

        if "phone" in data:
            user.phone = str(data.get("phone", user.phone))

        user.save()
        ensure_role_profile(user)

        return Response({"message": "User updated"}, status=status.HTTP_200_OK)

    if user.role == "admin":
        return Response({"error": "Admin user cannot be deleted"}, status=status.HTTP_403_FORBIDDEN)

    user.delete()
    return Response({"message": "User deleted"}, status=status.HTTP_200_OK)


# =========================
# ADMIN: SEND EMAIL (ALL or SELECTED)
# =========================
@api_view(["POST"])
@permission_classes([IsAdminRole])
def admin_send_email(request):
    data = request.data

    send_to = (data.get("send_to") or "all").strip().lower()
    recipients = data.get("recipients") or []
    subject = (data.get("subject") or "").strip()
    message = (data.get("message") or "").strip()
    email_type = (data.get("type") or "announcement").strip()

    if not subject or not message:
        return Response({"error": "subject and message are required"}, status=status.HTTP_400_BAD_REQUEST)

    if send_to == "all":
        emails = list(
            User.objects.exclude(email__isnull=True)
            .exclude(email__exact="")
            .values_list("email", flat=True)
        )
    elif send_to == "selected":
        if not isinstance(recipients, list) or len(recipients) == 0:
            return Response({"error": "recipients list is required for selected mode"}, status=status.HTTP_400_BAD_REQUEST)
        emails = [str(e).strip() for e in recipients if str(e).strip()]
    else:
        return Response({"error": "send_to must be 'all' or 'selected'"}, status=status.HTTP_400_BAD_REQUEST)

    if len(emails) == 0:
        return Response({"error": "No recipients found"}, status=status.HTTP_400_BAD_REQUEST)

    final_subject = f"[{email_type.upper()}] {subject}"
    final_message = message

    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None) or getattr(settings, "EMAIL_HOST_USER", None)
    if not from_email:
        return Response(
            {"error": "Email is not configured. Set DEFAULT_FROM_EMAIL or EMAIL_HOST_USER in settings.py"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    try:
        send_mail(
            subject=final_subject,
            message=final_message,
            from_email=from_email,
            recipient_list=emails,
            fail_silently=False,
        )
        return Response(
            {"message": "Email sent", "sent_to": send_to, "count": len(emails)},
            status=status.HTTP_200_OK,
        )
    except Exception as e:
        return Response({"error": f"Email sending failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)