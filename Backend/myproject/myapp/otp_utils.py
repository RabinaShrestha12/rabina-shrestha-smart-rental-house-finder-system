import secrets
from datetime import timedelta
from smtplib import SMTPAuthenticationError, SMTPException

from django.conf import settings
from django.core.mail import send_mail
from django.core.signing import dumps, loads, BadSignature
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone
from django.contrib.auth import get_user_model

from myapp.models import PendingSignup, PendingSignupOTP, EmailOTP

User = get_user_model()
TOKEN_SALT = "smart-rental-email-otp"


def _now():
    return timezone.now()


def _gen_code():
    return f"{secrets.randbelow(1000000):06d}"


def _is_gmail(email: str) -> bool:
    if not getattr(settings, "REQUIRE_GMAIL_ONLY", False):
        return True
    email = (email or "").strip().lower()
    return email.endswith("@gmail.com")


def _send_otp_email(to_email: str, code: str, purpose: str):
    app_name = getattr(settings, "APP_NAME", "Smart Rental House Finder")
    subject = f"{app_name} verification code"
    msg = (
        f"Your {app_name} {purpose} code is: {code}\n\n"
        f"This code will expire soon. If you did not request this, ignore this email."
    )

    # ✅ If SEND_REAL_EMAIL is False -> print in terminal
    if not getattr(settings, "SEND_REAL_EMAIL", True):
        print("\n============================================================")
        print(f"[DEV OTP] purpose : {purpose}")
        print(f"[DEV OTP] email   : {to_email}")
        print(f"[DEV OTP] code    : {code}")
        print("============================================================\n")
        return True, None

    try:
        send_mail(subject, msg, settings.DEFAULT_FROM_EMAIL, [to_email], fail_silently=False)
        return True, None
    except SMTPAuthenticationError:
        return False, (
            "Gmail authentication failed (535).\n"
            "Fix:\n"
            "1) Turn ON 2-Step Verification\n"
            "2) Create Google App Password (16 characters)\n"
            "3) Set EMAIL_HOST_USER and EMAIL_HOST_PASSWORD env vars\n"
            "4) Restart terminal/server\n"
        )
    except SMTPException as e:
        return False, f"SMTP error: {str(e)}"
    except Exception as e:
        return False, f"Email send failed: {str(e)}"


def _sign_token(payload: dict) -> str:
    return dumps(payload, salt=TOKEN_SALT)


def _unsign_token(token: str) -> dict:
    return loads(token, salt=TOKEN_SALT)


# SIGNUP OTP (PendingSignup)
def create_and_send_signup_otp(pending: PendingSignup):
    window = int(getattr(settings, "SIGNUP_OTP_RESEND_WINDOW_SECONDS", 900))
    limit = int(getattr(settings, "SIGNUP_OTP_RESEND_LIMIT", 3))
    ttl = int(getattr(settings, "SIGNUP_OTP_TTL_SECONDS", 600))

    since = _now() - timedelta(seconds=window)
    sent_count = PendingSignupOTP.objects.filter(pending=pending, created_at__gte=since).count()
    if sent_count >= limit:
        return None, "Too many OTP requests. Try again later."

    code = _gen_code()

    otp = PendingSignupOTP.objects.create(
        pending=pending,
        purpose="signup",
        code_hash=make_password(code),
        expires_at=_now() + timedelta(seconds=ttl),
    )

    ok, err = _send_otp_email(pending.email, code, "signup")

    # ✅ IMPORTANT: if sending fails, delete OTP so you don't get stuck in 429
    if not ok:
        otp.delete()
        return None, err

    token = _sign_token({"kind": "pending", "otp_id": otp.id})
    return token, None


# =========================================================
# USER OTP (every login optional)
# =========================================================
def create_and_send_user_otp(user: User, purpose: str):
    ttl = int(getattr(settings, "EMAIL_OTP_TTL_SECONDS", 600))
    window = int(getattr(settings, "EMAIL_OTP_RESEND_WINDOW_SECONDS", 900))
    limit = int(getattr(settings, "EMAIL_OTP_RESEND_LIMIT", 3))

    since = _now() - timedelta(seconds=window)
    sent_count = EmailOTP.objects.filter(user=user, purpose=purpose, created_at__gte=since).count()
    if sent_count >= limit:
        return None, "Too many OTP requests. Try again later."

    code = _gen_code()

    otp = EmailOTP.objects.create(
        user=user,
        purpose=purpose,
        code_hash=make_password(code),
        expires_at=_now() + timedelta(seconds=ttl),
    )

    ok, err = _send_otp_email(user.email, code, purpose)
    if not ok:
        otp.delete()
        return None, err

    token = _sign_token({"kind": "user", "otp_id": otp.id})
    return token, None



# VERIFY OTP (Pending + User)
def verify_otp(otp_token: str, code: str):
    try:
        payload = _unsign_token(otp_token)
    except BadSignature:
        return None, None, None, "Invalid OTP token."

    kind = payload.get("kind")
    otp_id = payload.get("otp_id")

    if kind == "pending":
        otp = PendingSignupOTP.objects.select_related("pending").filter(id=otp_id).first()
        if not otp:
            return None, None, None, "OTP not found."
        if otp.is_used:
            return None, None, None, "OTP already used."
        if otp.expires_at < _now():
            return None, None, None, "OTP expired."

        max_attempts = int(getattr(settings, "SIGNUP_OTP_MAX_ATTEMPTS", 5))
        if otp.attempts >= max_attempts:
            return None, None, None, "Too many attempts. Request a new code."

        otp.attempts += 1
        otp.save(update_fields=["attempts"])

        if not check_password(code, otp.code_hash):
            return None, None, None, "Invalid code."

        otp.is_used = True
        otp.save(update_fields=["is_used"])
        return "pending", otp.pending, "signup", None

    if kind == "user":
        otp = EmailOTP.objects.select_related("user").filter(id=otp_id).first()
        if not otp:
            return None, None, None, "OTP not found."
        if otp.is_used:
            return None, None, None, "OTP already used."
        if otp.expires_at < _now():
            return None, None, None, "OTP expired."

        max_attempts = int(getattr(settings, "EMAIL_OTP_MAX_ATTEMPTS", 5))
        if otp.attempts >= max_attempts:
            return None, None, None, "Too many attempts. Request a new code."

        otp.attempts += 1
        otp.save(update_fields=["attempts"])

        if not check_password(code, otp.code_hash):
            return None, None, None, "Invalid code."

        otp.is_used = True
        otp.save(update_fields=["is_used"])
        return "user", otp.user, otp.purpose, None

    return None, None, None, "Invalid OTP token."
