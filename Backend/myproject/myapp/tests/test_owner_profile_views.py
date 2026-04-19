from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from myapp.models import Owner, Listing

User = get_user_model()


class OwnerProfileViewsTests(APITestCase):
    def setUp(self):
        self.owner_user = User.objects.create_user(
            username="owner1",
            email="owner1@example.com",
            password="TestPass123!",
            role="owner",
            address="Kathmandu",
            phone="9800000001",
        )

        self.owner_user2 = User.objects.create_user(
            username="owner2",
            email="owner2@example.com",
            password="TestPass123!",
            role="owner",
            address="Pokhara",
            phone="9800000002",
        )

        self.tenant_user = User.objects.create_user(
            username="tenant1",
            email="tenant1@example.com",
            password="TestPass123!",
            role="tenant",
        )

        self.listing1 = Listing.objects.create(
            owner=self.owner_user,
            title="Room A",
            description="Nice room",
            property_type="room",
            price_per_month=12000,
            location="Kathmandu",
        )

        self.listing2 = Listing.objects.create(
            owner=self.owner_user,
            title="Flat B",
            description="Nice flat",
            property_type="flat",
            price_per_month=18000,
            location="Lalitpur",
        )

        self.other_owner_listing = Listing.objects.create(
            owner=self.owner_user2,
            title="Other Owner House",
            description="Other owner property",
            property_type="house",
            price_per_month=25000,
            location="Pokhara",
        )

    def test_ut01_owner_can_view_profile(self):
        self.client.force_authenticate(user=self.owner_user)

        url = reverse("owner_profile")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("owner", response.data)
        self.assertIn("listings", response.data)

    def test_ut02_owner_profile_auto_creates_owner_record_if_missing(self):
        self.client.force_authenticate(user=self.owner_user)

        Owner.objects.filter(user=self.owner_user).delete()
        self.assertFalse(Owner.objects.filter(user=self.owner_user).exists())

        url = reverse("owner_profile")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(Owner.objects.filter(user=self.owner_user).exists())

    def test_ut03_owner_profile_returns_only_logged_in_owner_listings(self):
        self.client.force_authenticate(user=self.owner_user)

        url = reverse("owner_profile")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["listings"]), 2)

        listing_ids = [item["id"] for item in response.data["listings"]]
        self.assertIn(self.listing1.id, listing_ids)
        self.assertIn(self.listing2.id, listing_ids)
        self.assertNotIn(self.other_owner_listing.id, listing_ids)

    def test_ut04_non_owner_cannot_access_owner_profile(self):
        self.client.force_authenticate(user=self.tenant_user)

        url = reverse("owner_profile")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["detail"], "Only owner can access this profile.")

    def test_ut05_unauthenticated_user_cannot_access_owner_profile(self):
        url = reverse("owner_profile")
        response = self.client.get(url)

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
        )

    def test_ut06_owner_profile_returns_owner_serializer_data(self):
        self.client.force_authenticate(user=self.owner_user)

        url = reverse("owner_profile")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("owner", response.data)
        self.assertTrue(response.data["owner"])

    def test_ut07_owner_profile_listings_are_ordered_newest_first(self):
        self.client.force_authenticate(user=self.owner_user)

        url = reverse("owner_profile")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = [item["id"] for item in response.data["listings"]]
        expected_ids = list(
            Listing.objects.filter(owner=self.owner_user)
            .order_by("-created_at")
            .values_list("id", flat=True)
        )
        self.assertEqual(returned_ids, expected_ids)