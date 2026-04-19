from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from myapp.models import Listing, BookingRequest, RentalContract

User = get_user_model()


class ContractViewsTests(APITestCase):
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
        self.tenant2 = User.objects.create_user(
            username="tenant2",
            email="tenant2@example.com",
            password="TestPass123!",
            role="tenant",
        )

        self.listing = Listing.objects.create(
            owner=self.owner,
            title="Room A",
            description="Nice room",
            property_type="room",
            price_per_month=12000,
            location="Kathmandu",
        )

        self.booking = BookingRequest.objects.create(
            listing=self.listing,
            tenant=self.tenant,
            status="accepted",
        )

        self.contract = RentalContract.objects.create(
            booking=self.booking,
            listing=self.listing,
            owner=self.owner,
            tenant=self.tenant,
            rent_amount=12000,
            security_deposit=5000,
            payment_due_day=5,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=30),
            utility_terms="Tenant pays electricity",
            house_rules="No smoking",
            special_terms="Keep room clean",
            status="draft",
        )

    def test_ut01_owner_can_view_contract_list(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(reverse("owner-contract-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_ut02_non_owner_cannot_view_owner_contract_list(self):
        self.client.force_authenticate(user=self.tenant)
        response = self.client.get(reverse("owner-contract-list"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_ut03_owner_can_view_contract_detail(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(reverse("owner-contract-detail", args=[self.contract.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_ut04_other_owner_cannot_view_contract_detail(self):
        self.client.force_authenticate(user=self.owner2)
        response = self.client.get(reverse("owner-contract-detail", args=[self.contract.id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_ut05_owner_can_update_contract(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.patch(
            reverse("owner-contract-detail", args=[self.contract.id]),
            {"rent_amount": "15000.00", "house_rules": "No smoking and no pets"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_ut06_owner_cannot_update_contract_in_invalid_status(self):
        self.contract.status = "rejected"
        self.contract.save()
        self.client.force_authenticate(user=self.owner)
        response = self.client.patch(
            reverse("owner-contract-detail", args=[self.contract.id]),
            {"rent_amount": "13000.00"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_ut07_owner_can_delete_draft_contract(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.delete(reverse("owner-contract-detail", args=[self.contract.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_ut08_owner_cannot_delete_active_contract(self):
        self.contract.status = "active"
        self.contract.save()
        self.client.force_authenticate(user=self.owner)
        response = self.client.delete(reverse("owner-contract-detail", args=[self.contract.id]))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_ut09_owner_can_send_draft_contract(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.post(reverse("owner-send-contract", args=[self.contract.id]), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_ut10_owner_cannot_send_non_draft_contract(self):
        self.contract.status = "pending_tenant"
        self.contract.save()
        self.client.force_authenticate(user=self.owner)
        response = self.client.post(reverse("owner-send-contract", args=[self.contract.id]), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_ut11_owner_cannot_send_contract_without_dates(self):
        self.contract.start_date = None
        self.contract.end_date = None
        self.contract.save()
        self.client.force_authenticate(user=self.owner)
        response = self.client.post(reverse("owner-send-contract", args=[self.contract.id]), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_ut12_owner_can_finalize_contract(self):
        self.contract.status = "pending_owner"
        self.contract.tenant_signed = True
        self.contract.save()
        self.client.force_authenticate(user=self.owner)
        response = self.client.post(reverse("owner-finalize-contract", args=[self.contract.id]), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_ut13_owner_cannot_finalize_wrong_status_contract(self):
        self.contract.status = "draft"
        self.contract.save()
        self.client.force_authenticate(user=self.owner)
        response = self.client.post(reverse("owner-finalize-contract", args=[self.contract.id]), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_ut14_owner_cannot_finalize_without_tenant_acceptance(self):
        self.contract.status = "pending_owner"
        self.contract.tenant_signed = False
        self.contract.save()
        self.client.force_authenticate(user=self.owner)
        response = self.client.post(reverse("owner-finalize-contract", args=[self.contract.id]), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_ut15_tenant_can_view_contract_list(self):
        self.client.force_authenticate(user=self.tenant)
        response = self.client.get(reverse("tenant-contract-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_ut16_non_tenant_cannot_view_tenant_contract_list(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(reverse("tenant-contract-list"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_ut17_tenant_can_view_contract_detail(self):
        self.client.force_authenticate(user=self.tenant)
        response = self.client.get(reverse("tenant-contract-detail", args=[self.contract.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_ut18_other_tenant_cannot_view_contract_detail(self):
        self.client.force_authenticate(user=self.tenant2)
        response = self.client.get(reverse("tenant-contract-detail", args=[self.contract.id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_ut19_tenant_can_accept_contract(self):
        self.contract.status = "pending_tenant"
        self.contract.save()
        self.client.force_authenticate(user=self.tenant)
        response = self.client.post(
            reverse("tenant-respond-contract", args=[self.contract.id]),
            {"action": "accept"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_ut20_tenant_can_reject_contract(self):
        self.contract.status = "pending_tenant"
        self.contract.save()
        self.client.force_authenticate(user=self.tenant)
        response = self.client.post(
            reverse("tenant-respond-contract", args=[self.contract.id]),
            {"action": "reject"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_ut21_tenant_invalid_action_rejected(self):
        self.contract.status = "pending_tenant"
        self.contract.save()
        self.client.force_authenticate(user=self.tenant)
        response = self.client.post(
            reverse("tenant-respond-contract", args=[self.contract.id]),
            {"action": "maybe"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_ut22_tenant_cannot_respond_when_not_pending_tenant(self):
        self.contract.status = "draft"
        self.contract.save()
        self.client.force_authenticate(user=self.tenant)
        response = self.client.post(
            reverse("tenant-respond-contract", args=[self.contract.id]),
            {"action": "accept"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_ut23_unauthenticated_user_cannot_access_owner_contracts(self):
        response = self.client.get(reverse("owner-contract-list"))
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_ut24_unauthenticated_user_cannot_access_tenant_contracts(self):
        response = self.client.get(reverse("tenant-contract-list"))
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])