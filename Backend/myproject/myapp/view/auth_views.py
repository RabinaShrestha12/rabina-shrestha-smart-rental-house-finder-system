# myapp/view/auth_views.py
from __future__ import annotations

import logging
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.db import IntegrityError, transaction
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, BasePermission
from rest_framework.response import Response
from rest_framework import status

from rest_framework_simplejwt.tokens import RefreshToken

from myapp.models import PendingSignup
from myapp.otp_utils import (
    create_and_send_signup_otp,
    create_and_send_user_otp,
    verify_otp,
)

logger = logging.getLogger(__name__)
User = get_user_model()


# -----------------------------
# Helpers
# -----------------------------
def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}


class IsAdminRole(BasePermission):
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


def get_user_by_email(email: str):
    if not email:
        return None
    return User.objects.filter(email__iexact=email).first()


def ensure_unique_username(username: str) -> str:
    base = username or "user"
    candidate = base
    i = 1
    while User.objects.filter(username=candidate).exists():
        candidate = f"{base}{i}"
        i += 1
    return candidate


def is_admin_user(user) -> bool:
    return bool(
        getattr(user, "role", None) == "admin"
        or user.is_staff
        or user.is_superuser
    )


def gmail_only_allowed(email: str) -> bool:
    if not getattr(settings, "REQUIRE_GMAIL_ONLY", False):
        return True
    email = (email or "").strip().lower()
    return email.endswith("@gmail.com")


def user_has_field(field_name: str) -> bool:
    try:
        return hasattr(User, field_name)
    except Exception:
        return hasattr(User(), field_name)


def otp_error_response(err):
    """
    Convert OTP/email errors into the correct HTTP status:
    - SMTP/Gmail auth/network failures -> 500 (server-side issue)
    - Rate limit / resend limit -> 429
    - Others -> 400
    """
    msg = str(err or "").strip()
    msg_lower = msg.lower()

    # Always log the real reason (so you see it in terminal)
    logger.warning("OTP send failed: %s", msg)

    # SMTP/Gmail auth or network issues -> 500
    smtp_keywords = [
        "535",
        "authentication",
        "username and password",
        "smtp",
        "smtpauthenticationerror",
        "timed out",
        "timeout",
        "connection",
        "network",
        "ssl",
        "tls",
    ]
    if any(k in msg_lower for k in smtp_keywords):
        return Response({"error": msg}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Rate limit / resend limit -> 429
    throttle_keywords = [
        "too many",
        "try again",
        "limit",
        "rate",
        "throttle",
        "cooldown",
        "resend",
        "wait",
        "blocked",
    ]
    if any(k in msg_lower for k in throttle_keywords):
        return Response({"error": msg}, status=status.HTTP_429_TOO_MANY_REQUESTS)

    # Otherwise: bad request / validation / business rule
    return Response({"error": msg}, status=status.HTTP_400_BAD_REQUEST)


# =========================================================
# REGISTER USER (OWNER/TENANT) -> OTP FIRST (PendingSignup)
# =========================================================
@api_view(["POST"])
@permission_classes([AllowAny])
def register_user(request):
    try:
        data = request.data

        email = (data.get("email") or "").strip().lower()
        password = data.get("password")
        role = (data.get("role") or "").strip().lower()
        address = data.get("address", "") or ""
        phone = str(data.get("phone", "") or "")
        username = (data.get("username") or "").strip()

        if not email or not password:
            return Response({"error": "email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

        if not gmail_only_allowed(email):
            return Response({"error": "Only Gmail addresses are allowed."}, status=status.HTTP_400_BAD_REQUEST)

        if role not in ["owner", "tenant"]:
            return Response({"error": "role must be owner/tenant"}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email__iexact=email).exists():
            return Response({"error": "Email already exists"}, status=status.HTTP_400_BAD_REQUEST)

        if not username:
            username = email.split("@")[0]
        username = ensure_unique_username(username)

        ttl = int(getattr(settings, "SIGNUP_OTP_TTL_SECONDS", 600))
        expires_at = timezone.now() + timedelta(seconds=ttl)

        ps, _ = PendingSignup.objects.update_or_create(
            email=email,
            defaults={
                "username": username,
                "role": role,
                "password_hash": make_password(password),
                "address": address,
                "phone": phone,
                "is_used": False,
                "expires_at": expires_at,
            },
        )

        otp_token, err = create_and_send_signup_otp(ps)
        if err:
            return otp_error_response(err)

        return Response(
            {
                "message": "OTP sent to your email. Verify to complete signup.",
                "verification_required": True,
                "purpose": "signup",
                "otp_token": otp_token,
                "email": email,
                "role": role,
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.exception("register_user failed")
        return Response({"error": "Server error", "detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =========================================================
# ADMIN REGISTER -> OTP FIRST (PendingSignup)
# =========================================================
@api_view(["POST"])
@permission_classes([AllowAny])
def register_admin(request):
    try:
        data = request.data

        email = (data.get("email") or "").strip().lower()
        password = data.get("password")
        address = data.get("address", "") or ""
        phone = str(data.get("phone", "") or "")
        username = (data.get("username") or "").strip()

        if not email or not password:
            return Response({"error": "email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

        if not gmail_only_allowed(email):
            return Response({"error": "Only Gmail addresses are allowed."}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email__iexact=email).exists():
            return Response({"error": "Email already exists"}, status=status.HTTP_400_BAD_REQUEST)

        if not username:
            username = email.split("@")[0]
        username = ensure_unique_username(username)

        ttl = int(getattr(settings, "SIGNUP_OTP_TTL_SECONDS", 600))
        expires_at = timezone.now() + timedelta(seconds=ttl)

        ps, _ = PendingSignup.objects.update_or_create(
            email=email,
            defaults={
                "username": username,
                "role": "admin",
                "password_hash": make_password(password),
                "address": address,
                "phone": phone,
                "is_used": False,
                "expires_at": expires_at,
            },
        )

        otp_token, err = create_and_send_signup_otp(ps)
        if err:
            return otp_error_response(err)

        return Response(
            {
                "message": "OTP sent to your email. Verify to complete admin signup.",
                "verification_required": True,
                "purpose": "signup",
                "otp_token": otp_token,
                "email": email,
                "role": "admin",
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.exception("register_admin failed")
        return Response({"error": "Server error", "detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =========================================================
# LOGIN USER (OWNER/TENANT) -> send OTP
# =========================================================
@api_view(["POST"])
@permission_classes([AllowAny])
def login_user(request):
    try:
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password")

        if not email or not password:
            return Response({"error": "email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

        user = get_user_by_email(email)
        if not user or not user.check_password(password):
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        if is_admin_user(user):
            return Response({"error": "Use admin login endpoint"}, status=status.HTTP_403_FORBIDDEN)

        if user_has_field("is_email_verified") and not getattr(user, "is_email_verified", True):
            otp_token, err = create_and_send_user_otp(user, purpose="verify")
            if err:
                return otp_error_response(err)

            return Response(
                {
                    "message": "Email not verified. OTP sent to your email.",
                    "verification_required": True,
                    "purpose": "verify",
                    "otp_token": otp_token,
                },
                status=status.HTTP_202_ACCEPTED,
            )

        if bool(getattr(settings, "REQUIRE_OTP_ON_EVERY_LOGIN", True)):
            otp_token, err = create_and_send_user_otp(user, purpose="login")
            if err:
                return otp_error_response(err)

            return Response(
                {
                    "message": "Login OTP sent to your email.",
                    "verification_required": True,
                    "purpose": "login",
                    "otp_token": otp_token,
                },
                status=status.HTTP_202_ACCEPTED,
            )

        tokens = get_tokens_for_user(user)
        return Response(
            {
                "message": "Login successful",
                "tokens": tokens,
                "role": getattr(user, "role", None),
                "user_id": user.id,
                "email": user.email,
                "username": user.username,
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.exception("login_user failed")
        return Response({"error": "Server error", "detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =========================================================
# LOGIN ADMIN (email+password -> OTP)
# =========================================================
@api_view(["POST"])
@permission_classes([AllowAny])
def login_admin(request):
    try:
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password")

        if not email or not password:
            return Response({"error": "email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

        user = get_user_by_email(email)
        if not user or not user.check_password(password):
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        if not is_admin_user(user):
            return Response({"error": "Not an admin account"}, status=status.HTTP_403_FORBIDDEN)

        if user_has_field("is_email_verified") and not getattr(user, "is_email_verified", True):
            otp_token, err = create_and_send_user_otp(user, purpose="verify")
            if err:
                return otp_error_response(err)

            return Response(
                {
                    "message": "Admin email not verified. OTP sent to your email.",
                    "verification_required": True,
                    "purpose": "verify",
                    "otp_token": otp_token,
                },
                status=status.HTTP_202_ACCEPTED,
            )

        if bool(getattr(settings, "REQUIRE_OTP_ON_EVERY_LOGIN", True)):
            otp_token, err = create_and_send_user_otp(user, purpose="login")
            if err:
                return otp_error_response(err)

            return Response(
                {
                    "message": "Admin login OTP sent to your email.",
                    "verification_required": True,
                    "purpose": "login",
                    "otp_token": otp_token,
                },
                status=status.HTTP_202_ACCEPTED,
            )

        tokens = get_tokens_for_user(user)
        return Response(
            {
                "message": "Admin login successful",
                "tokens": tokens,
                "role": getattr(user, "role", None),
                "user_id": user.id,
                "email": user.email,
                "username": user.username,
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.exception("login_admin failed")
        return Response({"error": "Server error", "detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =========================================================
# VERIFY OTP (signup / verify / login) -> returns JWT
# =========================================================
@api_view(["POST"])
@permission_classes([AllowAny])
def verify_email_otp(request):
    try:
        otp_token = request.data.get("otp_token")
        code = (request.data.get("code") or "").strip()

        if not otp_token or not code:
            return Response({"error": "otp_token and code are required"}, status=status.HTTP_400_BAD_REQUEST)

        kind, obj, purpose, err = verify_otp(otp_token, code)
        if err:
            return Response({"error": err}, status=status.HTTP_400_BAD_REQUEST)

        if kind == "pending" and purpose == "signup":
            pending = obj
            if pending.is_used:
                return Response({"error": "Signup already completed."}, status=status.HTTP_400_BAD_REQUEST)

            if getattr(pending, "role", "") == "admin":
                with transaction.atomic():
                    if User.objects.select_for_update().filter(role="admin").exists():
                        return Response({"error": "Admin already exists."}, status=status.HTTP_400_BAD_REQUEST)

            try:
                create_kwargs = dict(
                    username=pending.username,
                    email=pending.email,
                    role=pending.role,
                    address=getattr(pending, "address", ""),
                    phone=getattr(pending, "phone", ""),
                )

                if user_has_field("is_email_verified"):
                    create_kwargs["is_email_verified"] = True

                user = User.objects.create(**create_kwargs)
                user.password = pending.password_hash  # already hashed

                if pending.role == "admin":
                    user.is_staff = True
                    user.is_superuser = True

                user.save()

                pending.is_used = True
                pending.save(update_fields=["is_used"])

            except IntegrityError:
                return Response({"error": "Username or email already exists"}, status=status.HTTP_400_BAD_REQUEST)

            tokens = get_tokens_for_user(user)
            return Response(
                {
                    "message": "Signup verified. Account created.",
                    "tokens": tokens,
                    "role": getattr(user, "role", None),
                    "user_id": user.id,
                    "email": user.email,
                    "username": user.username,
                    "email_verified": getattr(user, "is_email_verified", True),
                },
                status=status.HTTP_201_CREATED,
            )

        if kind == "user":
            user = obj

            if purpose == "verify" and user_has_field("is_email_verified"):
                if not getattr(user, "is_email_verified", False):
                    user.is_email_verified = True
                    user.save(update_fields=["is_email_verified"])

            tokens = get_tokens_for_user(user)
            return Response(
                {
                    "message": "Verification successful",
                    "tokens": tokens,
                    "role": getattr(user, "role", None),
                    "user_id": user.id,
                    "email": user.email,
                    "username": user.username,
                    "email_verified": getattr(user, "is_email_verified", True),
                },
                status=status.HTTP_200_OK,
            )

        return Response({"error": "Invalid verification flow."}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.exception("verify_email_otp failed")
        return Response({"error": "Server error", "detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =========================================================
# RESEND OTP (signup pending OR user verify)
# =========================================================
@api_view(["POST"])
@permission_classes([AllowAny])
def resend_verification_code(request):
    try:
        email = (request.data.get("email") or "").strip().lower()
        if not email:
            return Response({"error": "email is required"}, status=status.HTTP_400_BAD_REQUEST)

        pending = PendingSignup.objects.filter(email=email, is_used=False).first()
        if pending:
            otp_token, err = create_and_send_signup_otp(pending)
            if err:
                return otp_error_response(err)
            return Response({"message": "OTP resent.", "otp_token": otp_token}, status=status.HTTP_200_OK)

        user = get_user_by_email(email)
        if user and user_has_field("is_email_verified") and not getattr(user, "is_email_verified", True):
            otp_token, err = create_and_send_user_otp(user, purpose="verify")
            if err:
                return otp_error_response(err)
            return Response({"message": "OTP resent.", "otp_token": otp_token}, status=status.HTTP_200_OK)

        return Response({"message": "If email exists, OTP was sent."}, status=status.HTTP_200_OK)

    except Exception as e:
        logger.exception("resend_verification_code failed")
        return Response({"error": "Server error", "detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =========================================================
# ADMIN LIST/CRUD
# =========================================================
@api_view(["GET"])
@permission_classes([IsAdminRole])
def list_all_users(request):
    qs = User.objects.all().values("id", "username", "email", "role", "address", "phone", "created_at")
    return Response(list(qs), status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAdminRole])
def list_owners(request):
    qs = User.objects.filter(role="owner").values("id", "username", "email", "role", "address", "phone", "created_at")
    return Response(list(qs), status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAdminRole])
def list_tenants(request):
    qs = User.objects.filter(role="tenant").values("id", "username", "email", "role", "address", "phone", "created_at")
    return Response(list(qs), status=status.HTTP_200_OK)


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAdminRole])
def user_detail_crud(request, user_id: int):
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
                "role": getattr(user, "role", None),
                "address": getattr(user, "address", ""),
                "phone": getattr(user, "phone", ""),
                "created_at": getattr(user, "created_at", None),
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

        if hasattr(user, "address"):
            user.address = data.get("address", getattr(user, "address", ""))

        if "role" in data:
            new_role = (data.get("role") or "").strip().lower()
            if new_role not in ["owner", "tenant", "admin"]:
                return Response({"error": "role must be owner/tenant/admin"}, status=status.HTTP_400_BAD_REQUEST)
            if hasattr(user, "role"):
                user.role = new_role

        if "phone" in data and hasattr(user, "phone"):
            user.phone = str(data.get("phone", getattr(user, "phone", "")))

        user.save()
        return Response({"message": "User updated"}, status=status.HTTP_200_OK)

    if getattr(user, "role", None) == "admin":
        return Response({"error": "Admin user cannot be deleted"}, status=status.HTTP_403_FORBIDDEN)

    user.delete()
    return Response({"message": "User deleted"}, status=status.HTTP_200_OK)
