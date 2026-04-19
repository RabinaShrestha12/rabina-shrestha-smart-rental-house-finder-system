from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from myapp.models import OwnerPlatformAgreement

User = get_user_model()


class OwnerPlatformAgreementViewsTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner1",
            email="owner1@example.com",
            password="TestPass123!",
            role="owner",
        )
        self.owner2 = User.objects.create_user(
            username="owner2",
            email="owner2@example.com",
            password="TestPass123!",
            role="owner",
        )
        self.tenant = User.objects.create_user(
            username="tenant1",
            email="tenant1@example.com",
            password="TestPass123!",
            role="tenant",
        )

    def test_ut01_owner_can_view_platform_agreement(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner-platform-agreement")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            OwnerPlatformAgreement.objects.filter(owner=self.owner).exists()
        )

    def test_ut02_owner_platform_agreement_is_created_if_missing(self):
        self.client.force_authenticate(user=self.owner)

        self.assertFalse(
            OwnerPlatformAgreement.objects.filter(owner=self.owner).exists()
        )

        url = reverse("owner-platform-agreement")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            OwnerPlatformAgreement.objects.filter(owner=self.owner).exists()
        )

    def test_ut03_non_owner_cannot_view_platform_agreement(self):
        self.client.force_authenticate(user=self.tenant)

        url = reverse("owner-platform-agreement")
        response = self.client.get(url)

        self.assertIn(
            response.status_code,
            [status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED]
        )

    def test_ut04_owner_can_accept_platform_agreement(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner-platform-agreement-respond")
        response = self.client.post(url, {"action": "accept"}, format="json")

        agreement = OwnerPlatformAgreement.objects.get(owner=self.owner)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(agreement.status, "accepted")
        self.assertIsNotNone(agreement.accepted_at)

    def test_ut05_owner_can_reject_platform_agreement(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner-platform-agreement-respond")
        response = self.client.post(url, {"action": "reject"}, format="json")

        agreement = OwnerPlatformAgreement.objects.get(owner=self.owner)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(agreement.status, "rejected")
        self.assertIsNotNone(agreement.rejected_at)

    def test_ut06_invalid_action_is_rejected(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner-platform-agreement-respond")
        response = self.client.post(url, {"action": "maybe"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"],
            "Invalid action. Use 'accept' or 'reject'."
        )

    def test_ut07_non_owner_cannot_respond_to_platform_agreement(self):
        self.client.force_authenticate(user=self.tenant)

        url = reverse("owner-platform-agreement-respond")
        response = self.client.post(url, {"action": "accept"}, format="json")

        self.assertIn(
            response.status_code,
            [status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED]
        )

    def test_ut08_each_owner_has_separate_platform_agreement(self):
        OwnerPlatformAgreement.objects.create(owner=self.owner)
        OwnerPlatformAgreement.objects.create(owner=self.owner2)

        self.assertEqual(
            OwnerPlatformAgreement.objects.filter(owner=self.owner).count(),
            1
        )
        self.assertEqual(
            OwnerPlatformAgreement.objects.filter(owner=self.owner2).count(),
            1
        )

    def test_ut09_unauthenticated_user_cannot_view_platform_agreement(self):
        url = reverse("owner-platform-agreement")
        response = self.client.get(url)

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
        )

    def test_ut10_unauthenticated_user_cannot_respond_to_platform_agreement(self):
        url = reverse("owner-platform-agreement-respond")
        response = self.client.post(url, {"action": "accept"}, format="json")

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
        )