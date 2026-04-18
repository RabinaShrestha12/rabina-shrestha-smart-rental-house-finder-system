from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from myapp.models import PendingSignup, PendingSignupOTP, Tenant, Owner, ServiceProviderProfile

# CHANGE THIS IMPORT IF YOUR FILE NAME IS DIFFERENT
from myapp.view.auth_views import (
    normalize_role,
    register_user,
    verify_otp,
    login_user,
    register_admin,
    login_admin,
    list_all_users,
    list_owners,
    list_tenants,
    list_providers,
    user_detail_crud,
    admin_send_email,
    request_password_reset_otp,
    reset_password,
)

User = get_user_model()


class AuthViewsTestCase(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

        self.admin = User.objects.create_user(
            username="admin1",
            email="admin@example.com",
            password="AdminPass123",
        )
        self.admin.role = "admin"
        self.admin.is_staff = True
        self.admin.is_superuser = True
        self.admin.is_email_verified = True
        self.admin.save()

    # =========================
    # HELPER
    # =========================
    def create_verified_user(self, role="tenant", email="user@example.com", password="TestPass123"):
        user = User.objects.create_user(
            username=email.split("@")[0],
            email=email,
            password=password,
        )
        user.role = role
        user.address = "Kathmandu"
        user.phone = "9800000000"
        user.is_email_verified = True
        user.save()
        return user

    # =========================
    # normalize_role
    # =========================
    def test_normalize_role_provider_variants(self):
        self.assertEqual(normalize_role("service_provider"), "provider")
        self.assertEqual(normalize_role("service provider"), "provider")
        self.assertEqual(normalize_role("service-provider"), "provider")
        self.assertEqual(normalize_role("serviceprovider"), "provider")
        self.assertEqual(normalize_role("tenant"), "tenant")

    # =========================
    # REGISTER USER
    # =========================
    @patch("myapp.view.auth_views.send_otp_email")
    def test_register_user_success(self, mock_send_otp_email):
        data = {
            "email": "tenant1@example.com",
            "password": "TestPass123",
            "role": "tenant",
            "username": "tenant1",
            "address": "Birtamod",
            "phone": "9811111111",
        }

        request = self.factory.post("/api/register_user/", data, format="json")
        response = register_user(request)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["email"], "tenant1@example.com")
        self.assertEqual(response.data["role"], "tenant")

        pending = PendingSignup.objects.filter(email="tenant1@example.com", is_used=False).first()
        self.assertIsNotNone(pending)

        otp = PendingSignupOTP.objects.filter(pending=pending, purpose="signup").first()
        self.assertIsNotNone(otp)

        mock_send_otp_email.assert_called_once()

    def test_register_user_missing_email_or_password(self):
        request = self.factory.post(
            "/api/register_user/",
            {"email": "", "password": "", "role": "tenant"},
            format="json",
        )
        response = register_user(request)

        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.data)

    def test_register_user_invalid_role(self):
        request = self.factory.post(
            "/api/register_user/",
            {
                "email": "wrong@example.com",
                "password": "TestPass123",
                "role": "wrongrole",
            },
            format="json",
        )
        response = register_user(request)

        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.data)

    @patch("myapp.view.auth_views.send_otp_email")
    def test_register_user_resend_otp_for_existing_pending(self, mock_send_otp_email):
        pending = PendingSignup.objects.create(
            email="pending@example.com",
            username="pendinguser",
            role="tenant",
            password_hash="hashedpass",
            address="Address",
            phone="9800000001",
            expires_at=timezone.now() + timedelta(days=1),
            is_used=False,
        )

        request = self.factory.post(
            "/api/register_user/",
            {
                "email": "pending@example.com",
                "password": "TestPass123",
                "role": "tenant",
            },
            format="json",
        )
        response = register_user(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["message"], "OTP resent. Please verify OTP once.")
        self.assertTrue(PendingSignupOTP.objects.filter(pending=pending, purpose="signup").exists())

    @patch("myapp.view.auth_views.send_otp_email")
    def test_register_user_existing_unverified_user_resends_otp(self, mock_send_otp_email):
        user = User.objects.create_user(
            username="olduser",
            email="old@example.com",
            password="OldPass123",
        )
        user.role = "tenant"
        user.is_email_verified = False
        user.save()

        request = self.factory.post(
            "/api/register_user/",
            {
                "email": "old@example.com",
                "password": "NewPass123",
                "role": "tenant",
            },
            format="json",
        )
        response = register_user(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["message"], "OTP resent. Please verify OTP once.")

    def test_register_user_existing_verified_user_fails(self):
        self.create_verified_user(role="tenant", email="verified@example.com")

        request = self.factory.post(
            "/api/register_user/",
            {
                "email": "verified@example.com",
                "password": "TestPass123",
                "role": "tenant",
            },
            format="json",
        )
        response = register_user(request)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Email already exists. Please login.")

    # =========================
    # VERIFY OTP
    # =========================
    @patch("myapp.view.auth_views.check_password", return_value=True)
    def test_verify_otp_success_for_tenant(self, mock_check_password):
        pending = PendingSignup.objects.create(
            email="verifytenant@example.com",
            username="verifytenant",
            role="tenant",
            password_hash="hashedpass",
            address="Jhapa",
            phone="9800111111",
            expires_at=timezone.now() + timedelta(days=1),
            is_used=False,
        )

        PendingSignupOTP.objects.create(
            pending=pending,
            purpose="signup",
            code_hash="hashedotp",
            expires_at=timezone.now() + timedelta(days=1),
            is_used=False,
            attempts=0,
        )

        request = self.factory.post(
            "/api/verify-otp/",
            {
                "email": "verifytenant@example.com",
                "code": "123456",
                "purpose": "signup",
            },
            format="json",
        )
        response = verify_otp(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["role"], "tenant")

        user = User.objects.filter(email="verifytenant@example.com").first()
        self.assertIsNotNone(user)
        self.assertTrue(user.is_email_verified)

        self.assertTrue(Tenant.objects.filter(user=user).exists())

        pending.refresh_from_db()
        self.assertTrue(pending.is_used)

    @patch("myapp.view.auth_views.check_password", return_value=True)
    def test_verify_otp_success_for_owner_creates_profile(self, mock_check_password):
        pending = PendingSignup.objects.create(
            email="ownerverify@example.com",
            username="ownerverify",
            role="owner",
            password_hash="hashedpass",
            address="Pokhara",
            phone="9800222222",
            expires_at=timezone.now() + timedelta(days=1),
            is_used=False,
        )

        PendingSignupOTP.objects.create(
            pending=pending,
            purpose="signup",
            code_hash="hashedotp",
            expires_at=timezone.now() + timedelta(days=1),
            is_used=False,
        )

        request = self.factory.post(
            "/api/verify-otp/",
            {"email": "ownerverify@example.com", "code": "123456", "purpose": "signup"},
            format="json",
        )
        response = verify_otp(request)

        self.assertEqual(response.status_code, 200)

        user = User.objects.get(email="ownerverify@example.com")
        self.assertTrue(Owner.objects.filter(user=user).exists())

    @patch("myapp.view.auth_views.check_password", return_value=True)
    def test_verify_otp_success_for_provider_creates_profile(self, mock_check_password):
        pending = PendingSignup.objects.create(
            email="providerverify@example.com",
            username="providerverify",
            role="provider",
            password_hash="hashedpass",
            address="Butwal",
            phone="9800333333",
            expires_at=timezone.now() + timedelta(days=1),
            is_used=False,
        )

        PendingSignupOTP.objects.create(
            pending=pending,
            purpose="signup",
            code_hash="hashedotp",
            expires_at=timezone.now() + timedelta(days=1),
            is_used=False,
        )

        request = self.factory.post(
            "/api/verify-otp/",
            {"email": "providerverify@example.com", "code": "123456", "purpose": "signup"},
            format="json",
        )
        response = verify_otp(request)

        self.assertEqual(response.status_code, 200)

        user = User.objects.get(email="providerverify@example.com")
        self.assertTrue(ServiceProviderProfile.objects.filter(user=user).exists())

    def test_verify_otp_without_pending_fails(self):
        request = self.factory.post(
            "/api/verify-otp/",
            {"email": "nopending@example.com", "code": "123456"},
            format="json",
        )
        response = verify_otp(request)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "No pending signup found. Please register again.")

    @patch("myapp.view.auth_views.check_password", return_value=False)
    def test_verify_otp_invalid_code(self, mock_check_password):
        pending = PendingSignup.objects.create(
            email="invalidotp@example.com",
            username="invalidotp",
            role="tenant",
            password_hash="hashedpass",
            expires_at=timezone.now() + timedelta(days=1),
            is_used=False,
        )

        otp = PendingSignupOTP.objects.create(
            pending=pending,
            purpose="signup",
            code_hash="hashedotp",
            expires_at=timezone.now() + timedelta(days=1),
            is_used=False,
            attempts=0,
        )

        request = self.factory.post(
            "/api/verify-otp/",
            {"email": "invalidotp@example.com", "code": "000000"},
            format="json",
        )
        response = verify_otp(request)

        otp.refresh_from_db()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Invalid OTP")
        self.assertEqual(otp.attempts, 1)

    def test_verify_otp_too_many_attempts(self):
        pending = PendingSignup.objects.create(
            email="maxattempt@example.com",
            username="maxattempt",
            role="tenant",
            password_hash="hashedpass",
            expires_at=timezone.now() + timedelta(days=1),
            is_used=False,
        )

        otp = PendingSignupOTP.objects.create(
            pending=pending,
            purpose="signup",
            code_hash="hashedotp",
            expires_at=timezone.now() + timedelta(days=1),
            is_used=False,
            attempts=5,
        )

        request = self.factory.post(
            "/api/verify-otp/",
            {"email": "maxattempt@example.com", "code": "123456"},
            format="json",
        )
        response = verify_otp(request)

        otp.refresh_from_db()
        self.assertEqual(response.status_code, 400)
        self.assertTrue(otp.is_used)

    # =========================
    # LOGIN USER
    # =========================
    def test_login_user_success(self):
        user = self.create_verified_user(role="tenant", email="login@example.com", password="LoginPass123")

        request = self.factory.post(
            "/api/login_user/",
            {"email": "login@example.com", "password": "LoginPass123"},
            format="json",
        )
        response = login_user(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["email"], user.email)
        self.assertEqual(response.data["role"], "tenant")

    def test_login_user_invalid_credentials(self):
        self.create_verified_user(role="tenant", email="wronglogin@example.com", password="RightPass123")

        request = self.factory.post(
            "/api/login_user/",
            {"email": "wronglogin@example.com", "password": "WrongPass123"},
            format="json",
        )
        response = login_user(request)

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["error"], "Invalid credentials")

    def test_login_user_unverified_email_fails(self):
        user = User.objects.create_user(
            username="unverified",
            email="unverified@example.com",
            password="TestPass123",
        )
        user.role = "tenant"
        user.is_email_verified = False
        user.save()

        request = self.factory.post(
            "/api/login_user/",
            {"email": "unverified@example.com", "password": "TestPass123"},
            format="json",
        )
        response = login_user(request)

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["error"], "Email not verified. Please verify signup OTP first.")

    # =========================
    # ADMIN REGISTER / LOGIN
    # =========================
    def test_register_admin_fails_if_admin_already_exists(self):
        request = self.factory.post(
            "/api/register_admin/",
            {
                "email": "newadmin@example.com",
                "password": "AdminPass123",
                "username": "newadmin",
            },
            format="json",
        )
        response = register_admin(request)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Admin already exists")

    def test_login_admin_success(self):
        request = self.factory.post(
            "/api/login_admin/",
            {"email": "admin@example.com", "password": "AdminPass123"},
            format="json",
        )
        response = login_admin(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["role"], "admin")

    def test_login_admin_not_admin_fails(self):
        self.create_verified_user(role="tenant", email="tenantadmincheck@example.com", password="TestPass123")

        request = self.factory.post(
            "/api/login_admin/",
            {"email": "tenantadmincheck@example.com", "password": "TestPass123"},
            format="json",
        )
        response = login_admin(request)

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["error"], "Not an admin account")

    # =========================
    # ADMIN LIST USERS
    # =========================
    def test_list_all_users_admin_only(self):
        self.create_verified_user(role="owner", email="owner1@example.com")
        self.create_verified_user(role="tenant", email="tenant1@example.com")
        self.create_verified_user(role="provider", email="provider1@example.com")

        request = self.factory.get("/api/admin/users/")
        force_authenticate(request, user=self.admin)
        response = list_all_users(request)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(response.data) >= 4)

    def test_list_owners(self):
        self.create_verified_user(role="owner", email="ownerlist@example.com")

        request = self.factory.get("/api/admin/owners/")
        force_authenticate(request, user=self.admin)
        response = list_owners(request)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(any(u["role"] == "owner" for u in response.data))

    def test_list_tenants(self):
        self.create_verified_user(role="tenant", email="tenantlist@example.com")

        request = self.factory.get("/api/admin/tenants/")
        force_authenticate(request, user=self.admin)
        response = list_tenants(request)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(any(u["role"] == "tenant" for u in response.data))

    def test_list_providers(self):
        self.create_verified_user(role="provider", email="providerlist@example.com")

        request = self.factory.get("/api/admin/providers/")
        force_authenticate(request, user=self.admin)
        response = list_providers(request)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(any(u["role"] == "provider" for u in response.data))

    # =========================
    # USER DETAIL CRUD
    # =========================
    def test_user_detail_get(self):
        user = self.create_verified_user(role="tenant", email="detail@example.com")

        request = self.factory.get(f"/api/admin/users/{user.id}/")
        force_authenticate(request, user=self.admin)
        response = user_detail_crud(request, user.id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["email"], "detail@example.com")

    def test_user_detail_put_update_role_and_phone(self):
        user = self.create_verified_user(role="tenant", email="update@example.com")

        request = self.factory.put(
            f"/api/admin/users/{user.id}/",
            {"role": "service_provider", "phone": "9812345678"},
            format="json",
        )
        force_authenticate(request, user=self.admin)
        response = user_detail_crud(request, user.id)

        user.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(user.role, "provider")
        self.assertEqual(user.phone, "9812345678")
        self.assertTrue(ServiceProviderProfile.objects.filter(user=user).exists())

    def test_user_detail_delete_non_admin(self):
        user = self.create_verified_user(role="tenant", email="deleteuser@example.com")

        request = self.factory.delete(f"/api/admin/users/{user.id}/")
        force_authenticate(request, user=self.admin)
        response = user_detail_crud(request, user.id)

        self.assertEqual(response.status_code, 200)
        self.assertFalse(User.objects.filter(id=user.id).exists())

    def test_user_detail_delete_admin_blocked(self):
        request = self.factory.delete(f"/api/admin/users/{self.admin.id}/")
        force_authenticate(request, user=self.admin)
        response = user_detail_crud(request, self.admin.id)

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["error"], "Admin user cannot be deleted")

    # =========================
    # ADMIN SEND EMAIL
    # =========================
    @patch("myapp.view.auth_views.send_mail")
    def test_admin_send_email_to_all(self, mock_send_mail):
        self.create_verified_user(role="tenant", email="mail1@example.com")
        self.create_verified_user(role="owner", email="mail2@example.com")

        request = self.factory.post(
            "/api/admin/send-email/",
            {
                "send_to": "all",
                "subject": "Notice",
                "message": "Hello all",
                "type": "announcement",
            },
            format="json",
        )
        force_authenticate(request, user=self.admin)

        with patch("myapp.view.auth_views.settings.DEFAULT_FROM_EMAIL", "noreply@example.com"):
            response = admin_send_email(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["message"], "Email sent")
        mock_send_mail.assert_called_once()

    @patch("myapp.view.auth_views.send_mail")
    def test_admin_send_email_to_selected(self, mock_send_mail):
        request = self.factory.post(
            "/api/admin/send-email/",
            {
                "send_to": "selected",
                "recipients": ["a@example.com", "b@example.com"],
                "subject": "Custom",
                "message": "Selected users",
                "type": "info",
            },
            format="json",
        )
        force_authenticate(request, user=self.admin)

        with patch("myapp.view.auth_views.settings.DEFAULT_FROM_EMAIL", "noreply@example.com"):
            response = admin_send_email(request)

        self.assertEqual(response.status_code, 200)
        mock_send_mail.assert_called_once()

    def test_admin_send_email_missing_subject_or_message(self):
        request = self.factory.post(
            "/api/admin/send-email/",
            {
                "send_to": "all",
                "subject": "",
                "message": "",
            },
            format="json",
        )
        force_authenticate(request, user=self.admin)
        response = admin_send_email(request)

        self.assertEqual(response.status_code, 400)

    # =========================
    # PASSWORD RESET OTP
    # =========================
    @patch("myapp.view.auth_views.send_reset_otp_email")
    def test_request_password_reset_otp_success(self, mock_send_reset_otp_email):
        self.create_verified_user(role="tenant", email="reset@example.com", password="OldPass123")

        request = self.factory.post(
            "/api/request-reset-otp/",
            {"email": "reset@example.com"},
            format="json",
        )
        response = request_password_reset_otp(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["message"], "Password reset OTP sent to email")

        pending = PendingSignup.objects.filter(email="reset@example.com", is_used=False).first()
        self.assertIsNotNone(pending)

        otp = PendingSignupOTP.objects.filter(pending=pending, purpose="reset").first()
        self.assertIsNotNone(otp)

        mock_send_reset_otp_email.assert_called_once()

    def test_request_password_reset_otp_user_not_found(self):
        request = self.factory.post(
            "/api/request-reset-otp/",
            {"email": "nouser@example.com"},
            format="json",
        )
        response = request_password_reset_otp(request)

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["error"], "User with this email does not exist")

    @patch("myapp.view.auth_views.check_password", return_value=True)
    def test_reset_password_success(self, mock_check_password):
        user = self.create_verified_user(role="tenant", email="resetpass@example.com", password="OldPass123")

        pending = PendingSignup.objects.create(
            email="resetpass@example.com",
            username=user.username,
            role="tenant",
            password_hash=user.password,
            address=user.address,
            phone=user.phone,
            expires_at=timezone.now() + timedelta(days=1),
            is_used=False,
        )

        otp = PendingSignupOTP.objects.create(
            pending=pending,
            purpose="reset",
            code_hash="hashedotp",
            expires_at=timezone.now() + timedelta(minutes=10),
            is_used=False,
            attempts=0,
        )

        request = self.factory.post(
            "/api/reset-password/",
            {
                "email": "resetpass@example.com",
                "code": "123456",
                "new_password": "NewPass123",
            },
            format="json",
        )
        response = reset_password(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["message"],
            "Password reset successful. You can now login with your new password."
        )

        user.refresh_from_db()
        self.assertTrue(user.check_password("NewPass123"))

        otp.refresh_from_db()
        self.assertTrue(otp.is_used)

    def test_reset_password_expired_otp(self):
        user = self.create_verified_user(role="tenant", email="expired@example.com", password="OldPass123")

        pending = PendingSignup.objects.create(
            email="expired@example.com",
            username=user.username,
            role="tenant",
            password_hash=user.password,
            expires_at=timezone.now() + timedelta(days=1),
            is_used=False,
        )

        otp = PendingSignupOTP.objects.create(
            pending=pending,
            purpose="reset",
            code_hash="hashedotp",
            expires_at=timezone.now() - timedelta(minutes=1),
            is_used=False,
            attempts=0,
        )

        request = self.factory.post(
            "/api/reset-password/",
            {
                "email": "expired@example.com",
                "code": "123456",
                "new_password": "NewPass123",
            },
            format="json",
        )
        response = reset_password(request)

        otp.refresh_from_db()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "OTP expired. Please request a new OTP.")
        self.assertTrue(otp.is_used)

    def test_reset_password_too_many_attempts(self):
        user = self.create_verified_user(role="tenant", email="attempts@example.com", password="OldPass123")

        pending = PendingSignup.objects.create(
            email="attempts@example.com",
            username=user.username,
            role="tenant",
            password_hash=user.password,
            expires_at=timezone.now() + timedelta(days=1),
            is_used=False,
        )

        otp = PendingSignupOTP.objects.create(
            pending=pending,
            purpose="reset",
            code_hash="hashedotp",
            expires_at=timezone.now() + timedelta(minutes=10),
            is_used=False,
            attempts=5,
        )

        request = self.factory.post(
            "/api/reset-password/",
            {
                "email": "attempts@example.com",
                "code": "123456",
                "new_password": "NewPass123",
            },
            format="json",
        )
        response = reset_password(request)

        otp.refresh_from_db()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Too many attempts. Please request a new OTP.")
        self.assertTrue(otp.is_used)

    @patch("myapp.view.auth_views.check_password", return_value=False)
    def test_reset_password_invalid_otp(self, mock_check_password):
        user = self.create_verified_user(role="tenant", email="invalidreset@example.com", password="OldPass123")

        pending = PendingSignup.objects.create(
            email="invalidreset@example.com",
            username=user.username,
            role="tenant",
            password_hash=user.password,
            expires_at=timezone.now() + timedelta(days=1),
            is_used=False,
        )

        otp = PendingSignupOTP.objects.create(
            pending=pending,
            purpose="reset",
            code_hash="hashedotp",
            expires_at=timezone.now() + timedelta(minutes=10),
            is_used=False,
            attempts=0,
        )

        request = self.factory.post(
            "/api/reset-password/",
            {
                "email": "invalidreset@example.com",
                "code": "000000",
                "new_password": "NewPass123",
            },
            format="json",
        )
        response = reset_password(request)

        otp.refresh_from_db()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Invalid OTP")
        self.assertEqual(otp.attempts, 1)