from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from myapp.models import Listing, MaintenanceRequest, ServiceProviderProfile

User = get_user_model()


class MaintenanceViewsTests(APITestCase):
    def setUp(self):
        # Users
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

        self.provider = User.objects.create_user(
            username="provider1",
            email="provider1@example.com",
            password="TestPass123!",
            role="provider",
        )

        self.provider2 = User.objects.create_user(
            username="provider2",
            email="provider2@example.com",
            password="TestPass123!",
            role="provider",
        )

        self.tenant = User.objects.create_user(
            username="tenant1",
            email="tenant1@example.com",
            password="TestPass123!",
            role="tenant",
        )

        # Listings
        self.listing = Listing.objects.create(
            owner=self.owner,
            title="Test House",
            description="Nice property",
            property_type="room",
            price_per_month=12000,
            location="Kathmandu",
        )

        self.other_listing = Listing.objects.create(
            owner=self.owner2,
            title="Other House",
            description="Other property",
            property_type="flat",
            price_per_month=15000,
            location="Pokhara",
        )

        # Provider profiles
        self.provider_profile = ServiceProviderProfile.objects.create(
            user=self.provider,
            category="plumbing",
            service_area="Kathmandu",
            availability="available",
            bio="Plumber bio",
            phone="9800000001",
        )

        self.provider_profile2 = ServiceProviderProfile.objects.create(
            user=self.provider2,
            category="electrical",
            service_area="Lalitpur",
            availability="available",
            bio="Electrician bio",
            phone="9800000002",
        )

        # Maintenance request
        self.maintenance = MaintenanceRequest.objects.create(
            owner=self.owner,
            listing=self.listing,
            assigned_provider=None,
            category="plumbing",
            priority="medium",
            status="open",
            title="Pipe issue",
            description="Kitchen pipe leaking",
        )

    # -----------------------------
    # OWNER SIDE
    # -----------------------------
    def test_ut01_owner_can_create_maintenance_request(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_create_maintenance_request")
        payload = {
            "title": "Water leakage",
            "description": "Bathroom pipe is leaking",
            "category": "plumbing",
            "priority": "high",
            "listing_id": self.listing.id,
        }

        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "Water leakage")
        self.assertEqual(response.data["status"], "open")
        self.assertEqual(response.data["listing_id"], self.listing.id)
        self.assertTrue(
            MaintenanceRequest.objects.filter(
                owner=self.owner,
                title="Water leakage"
            ).exists()
        )

    def test_ut02_owner_create_requires_title(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_create_maintenance_request")
        payload = {
            "title": "",
            "description": "Bathroom pipe is leaking",
            "category": "plumbing",
            "priority": "high",
            "listing_id": self.listing.id,
        }

        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Title is required.")

    def test_ut03_owner_create_requires_description(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_create_maintenance_request")
        payload = {
            "title": "Water leakage",
            "description": "",
            "category": "plumbing",
            "priority": "high",
            "listing_id": self.listing.id,
        }

        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Description is required.")

    def test_ut04_owner_create_invalid_category(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_create_maintenance_request")
        payload = {
            "title": "Water leakage",
            "description": "Bathroom pipe is leaking",
            "category": "invalid_category",
            "priority": "high",
            "listing_id": self.listing.id,
        }

        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Invalid category.")

    def test_ut05_owner_create_invalid_priority(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_create_maintenance_request")
        payload = {
            "title": "Water leakage",
            "description": "Bathroom pipe is leaking",
            "category": "plumbing",
            "priority": "invalid_priority",
            "listing_id": self.listing.id,
        }

        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Invalid priority.")

    def test_ut06_owner_create_with_other_owner_listing_fails(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_create_maintenance_request")
        payload = {
            "title": "Water leakage",
            "description": "Bathroom pipe is leaking",
            "category": "plumbing",
            "priority": "high",
            "listing_id": self.other_listing.id,
        }

        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["detail"], "Listing not found or not yours.")

    def test_ut07_owner_can_list_maintenance_requests(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_maintenance_requests")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], self.maintenance.title)

    def test_ut08_owner_can_view_maintenance_request_detail(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_maintenance_request_detail", args=[self.maintenance.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.maintenance.id)
        self.assertEqual(response.data["title"], self.maintenance.title)

    def test_ut09_owner_cannot_view_other_owner_maintenance_request_detail(self):
        self.client.force_authenticate(user=self.owner2)

        url = reverse("owner_maintenance_request_detail", args=[self.maintenance.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["detail"], "Maintenance request not found.")

    def test_ut10_owner_can_update_maintenance_request(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_update_maintenance_request", args=[self.maintenance.id])
        payload = {
            "title": "Updated pipe issue",
            "description": "Updated kitchen pipe issue",
            "category": "electrical",
            "priority": "high",
            "status": "in_progress",
        }

        response = self.client.patch(url, payload, format="json")
        self.maintenance.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.maintenance.title, "Updated pipe issue")
        self.assertEqual(self.maintenance.description, "Updated kitchen pipe issue")
        self.assertEqual(self.maintenance.category, "electrical")
        self.assertEqual(self.maintenance.priority, "high")
        self.assertEqual(self.maintenance.status, "in_progress")

    def test_ut11_owner_update_rejects_empty_title(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_update_maintenance_request", args=[self.maintenance.id])
        response = self.client.patch(url, {"title": ""}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Title cannot be empty.")

    def test_ut12_owner_update_rejects_empty_description(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_update_maintenance_request", args=[self.maintenance.id])
        response = self.client.patch(url, {"description": ""}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Description cannot be empty.")

    def test_ut13_owner_update_invalid_category(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_update_maintenance_request", args=[self.maintenance.id])
        response = self.client.patch(url, {"category": "wrong"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Invalid category.")

    def test_ut14_owner_update_invalid_priority(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_update_maintenance_request", args=[self.maintenance.id])
        response = self.client.patch(url, {"priority": "wrong"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Invalid priority.")

    def test_ut15_owner_update_invalid_status(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_update_maintenance_request", args=[self.maintenance.id])
        response = self.client.patch(url, {"status": "completed"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Invalid status.")

    def test_ut16_owner_update_without_valid_fields_fails(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_update_maintenance_request", args=[self.maintenance.id])
        response = self.client.patch(url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "No valid fields provided for update.")

    def test_ut17_owner_can_remove_listing_from_maintenance_request(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_update_maintenance_request", args=[self.maintenance.id])
        response = self.client.patch(url, {"listing_id": ""}, format="json")
        self.maintenance.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(self.maintenance.listing)

    def test_ut18_owner_can_delete_maintenance_request(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_delete_maintenance_request", args=[self.maintenance.id])
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(
            MaintenanceRequest.objects.filter(id=self.maintenance.id).exists()
        )

    def test_ut19_owner_can_update_maintenance_status(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_update_maintenance_status", args=[self.maintenance.id])
        response = self.client.patch(url, {"status": "resolved"}, format="json")
        self.maintenance.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.maintenance.status, "resolved")

    def test_ut20_owner_update_maintenance_status_invalid_status(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_update_maintenance_status", args=[self.maintenance.id])
        response = self.client.patch(url, {"status": "completed"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Invalid status.")

    def test_ut21_owner_can_view_available_providers(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_available_providers")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_ut22_owner_can_filter_available_providers(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_available_providers")
        response = self.client.get(url, {"category": "plumbing", "service_area": "kathmandu"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["category"], "plumbing")

    def test_ut23_owner_can_assign_provider(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_assign_provider", args=[self.maintenance.id])
        payload = {"provider_profile_id": self.provider_profile.id}

        response = self.client.post(url, payload, format="json")
        self.maintenance.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.maintenance.assigned_provider, self.provider)

    def test_ut24_owner_assign_provider_requires_provider_profile_id(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_assign_provider", args=[self.maintenance.id])
        response = self.client.post(url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "provider_profile_id is required.")

    def test_ut25_owner_assign_provider_with_invalid_profile_fails(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_assign_provider", args=[self.maintenance.id])
        response = self.client.post(url, {"provider_profile_id": 99999}, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["detail"], "Service provider not found.")

    # -----------------------------
    # PROVIDER SIDE
    # -----------------------------
    def test_ut26_provider_can_view_assigned_jobs(self):
        self.maintenance.assigned_provider = self.provider
        self.maintenance.save()

        self.client.force_authenticate(user=self.provider)

        url = reverse("provider_my_jobs")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.maintenance.id)

    def test_ut27_provider_can_accept_job(self):
        self.maintenance.assigned_provider = self.provider
        self.maintenance.save()

        self.client.force_authenticate(user=self.provider)

        url = reverse("provider_accept_job", args=[self.maintenance.id])
        response = self.client.post(url, {}, format="json")
        self.maintenance.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.maintenance.status, "in_progress")

    def test_ut28_provider_cannot_accept_unassigned_job(self):
        self.client.force_authenticate(user=self.provider)

        url = reverse("provider_accept_job", args=[self.maintenance.id])
        response = self.client.post(url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["detail"], "Job not found.")

    def test_ut29_provider_can_update_job_status(self):
        self.maintenance.assigned_provider = self.provider
        self.maintenance.save()

        self.client.force_authenticate(user=self.provider)

        url = reverse("provider_update_job_status", args=[self.maintenance.id])
        response = self.client.patch(url, {"status": "rejected"}, format="json")
        self.maintenance.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.maintenance.status, "rejected")

    def test_ut30_provider_completed_is_saved_as_resolved(self):
        self.maintenance.assigned_provider = self.provider
        self.maintenance.save()

        self.client.force_authenticate(user=self.provider)

        url = reverse("provider_update_job_status", args=[self.maintenance.id])
        response = self.client.patch(url, {"status": "completed"}, format="json")
        self.maintenance.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.maintenance.status, "resolved")
        self.assertEqual(response.data["status"], "resolved")

    def test_ut31_provider_update_job_status_invalid_status(self):
        self.maintenance.assigned_provider = self.provider
        self.maintenance.save()

        self.client.force_authenticate(user=self.provider)

        url = reverse("provider_update_job_status", args=[self.maintenance.id])
        response = self.client.patch(url, {"status": "bad-status"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Invalid status.")

    def test_ut32_unauthenticated_user_cannot_access_owner_requests(self):
        url = reverse("owner_maintenance_requests")
        response = self.client.get(url)

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
        )

    def test_ut33_wrong_role_cannot_access_provider_jobs(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("provider_my_jobs")
        response = self.client.get(url)

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
        )