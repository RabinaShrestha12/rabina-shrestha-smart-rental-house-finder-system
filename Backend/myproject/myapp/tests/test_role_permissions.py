from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import path
from rest_framework.test import APITestCase
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from myapp.view.permissions import (
    IsTenantRole,
    IsOwnerRole,
    IsProviderRole,
    IsAdminRole,
)

User = get_user_model()


class TenantOnlyView(APIView):
    permission_classes = [IsTenantRole]

    def get(self, request):
        return Response({"detail": "Tenant access granted"}, status=status.HTTP_200_OK)


class OwnerOnlyView(APIView):
    permission_classes = [IsOwnerRole]

    def get(self, request):
        return Response({"detail": "Owner access granted"}, status=status.HTTP_200_OK)


class ProviderOnlyView(APIView):
    permission_classes = [IsProviderRole]

    def get(self, request):
        return Response({"detail": "Provider access granted"}, status=status.HTTP_200_OK)


class AdminOnlyView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        return Response({"detail": "Admin access granted"}, status=status.HTTP_200_OK)


urlpatterns = [
    path("test/tenant-only/", TenantOnlyView.as_view(), name="test_tenant_only"),
    path("test/owner-only/", OwnerOnlyView.as_view(), name="test_owner_only"),
    path("test/provider-only/", ProviderOnlyView.as_view(), name="test_provider_only"),
    path("test/admin-only/", AdminOnlyView.as_view(), name="test_admin_only"),
]


@override_settings(ROOT_URLCONF=__name__)
class RolePermissionTests(APITestCase):
    def setUp(self):
        self.tenant = User.objects.create_user(
            username="tenant1",
            email="tenant1@example.com",
            password="TestPass123!",
            role="tenant",
        )
        self.owner = User.objects.create_user(
            username="owner1",
            email="owner1@example.com",
            password="TestPass123!",
            role="owner",
        )
        self.provider = User.objects.create_user(
            username="provider1",
            email="provider1@example.com",
            password="TestPass123!",
            role="provider",
        )
        self.admin = User.objects.create_user(
            username="admin1",
            email="admin1@example.com",
            password="TestPass123!",
            role="admin",
        )

    # TENANT
    def test_ut01_tenant_can_access_tenant_only_view(self):
        self.client.force_authenticate(user=self.tenant)
        response = self.client.get("/test/tenant-only/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_ut02_owner_cannot_access_tenant_only_view(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.get("/test/tenant-only/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_ut03_unauthenticated_user_cannot_access_tenant_only_view(self):
        response = self.client.get("/test/tenant-only/")
        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
        )

    # OWNER
    def test_ut04_owner_can_access_owner_only_view(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.get("/test/owner-only/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_ut05_tenant_cannot_access_owner_only_view(self):
        self.client.force_authenticate(user=self.tenant)
        response = self.client.get("/test/owner-only/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_ut06_unauthenticated_user_cannot_access_owner_only_view(self):
        response = self.client.get("/test/owner-only/")
        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
        )

    # PROVIDER
    def test_ut07_provider_can_access_provider_only_view(self):
        self.client.force_authenticate(user=self.provider)
        response = self.client.get("/test/provider-only/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_ut08_owner_cannot_access_provider_only_view(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.get("/test/provider-only/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_ut09_unauthenticated_user_cannot_access_provider_only_view(self):
        response = self.client.get("/test/provider-only/")
        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
        )

    # ADMIN
    def test_ut10_admin_can_access_admin_only_view(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/test/admin-only/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_ut11_provider_cannot_access_admin_only_view(self):
        self.client.force_authenticate(user=self.provider)
        response = self.client.get("/test/admin-only/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_ut12_unauthenticated_user_cannot_access_admin_only_view(self):
        response = self.client.get("/test/admin-only/")
        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
        )