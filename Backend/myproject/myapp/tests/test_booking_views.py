from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from myapp.models import Listing, BookingRequest, BookingMessage, RentalContract
from myapp.view.booking_views import (
    tenant_create_booking_request,
    tenant_my_booking_requests,
    owner_booking_inbox,
    booking_messages,
    booking_send_message,
    booking_update_message,
    booking_delete_message,
    owner_set_booking_status,
    create_message_legacy,
)

User = get_user_model()


class BookingContractTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

        self.owner = User.objects.create_user(
            username="owner1",
            email="owner1@example.com",
            password="Test12345",
        )
        self.owner.role = "owner"
        self.owner.is_email_verified = True
        self.owner.save()

        self.tenant = User.objects.create_user(
            username="tenant1",
            email="tenant1@example.com",
            password="Test12345",
        )
        self.tenant.role = "tenant"
        self.tenant.is_email_verified = True
        self.tenant.save()

        self.other_user = User.objects.create_user(
            username="other1",
            email="other1@example.com",
            password="Test12345",
        )
        self.other_user.role = "tenant"
        self.other_user.is_email_verified = True
        self.other_user.save()

        self.listing = Listing.objects.create(
            owner=self.owner,
            title="Test Room",
            location="Sydney",
            price_per_month=500,
            property_type="room",
            is_available=True,
            status="available",
        )

        self.booking = BookingRequest.objects.create(
            listing=self.listing,
            tenant=self.tenant,
            status="pending",
        )

    def test_ut26_tenant_can_create_booking_request(self):
        """Validate tenant can create booking request (UT26)"""
        request = self.factory.post(
            "/api/tenant/booking-requests/create/",
            {
                "listing_id": self.listing.id,
                "first_message": "I want to book this room",
            },
            format="json",
        )
        force_authenticate(request, user=self.tenant)

        response = tenant_create_booking_request(request)

        self.assertEqual(response.status_code, 201)
        self.assertIn("id", response.data)
        self.assertEqual(response.data["status"], "pending")

    def test_ut27_tenant_can_view_own_booking_requests(self):
        """Validate tenant can view own booking requests (UT27)"""
        request = self.factory.get("/api/tenant/booking-requests/")
        force_authenticate(request, user=self.tenant)

        response = tenant_my_booking_requests(request)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(response.data) >= 1)

    def test_ut28_owner_can_view_booking_inbox(self):
        """Validate owner can view booking inbox (UT28)"""
        request = self.factory.get("/api/owner/booking-requests/")
        force_authenticate(request, user=self.owner)

        response = owner_booking_inbox(request)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(response.data) >= 1)

    def test_ut29_related_user_can_view_booking_messages(self):
        """Validate related user can view booking messages (UT29)"""
        BookingMessage.objects.create(
            request=self.booking,
            sender=self.tenant,
            text="Hello owner",
        )

        request = self.factory.get(f"/api/booking-requests/{self.booking.id}/messages/")
        force_authenticate(request, user=self.owner)

        response = booking_messages(request, self.booking.id)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(response.data) >= 1)

    def test_ut30_unrelated_user_cannot_view_booking_messages(self):
        """Validate unrelated user cannot view booking messages (UT30)"""
        request = self.factory.get(f"/api/booking-requests/{self.booking.id}/messages/")
        force_authenticate(request, user=self.other_user)

        response = booking_messages(request, self.booking.id)

        self.assertEqual(response.status_code, 403)

    def test_ut31_tenant_can_send_booking_message(self):
        """Validate tenant can send booking message (UT31)"""
        request = self.factory.post(
            f"/api/booking-requests/{self.booking.id}/messages/send/",
            {"text": "I am interested in this room"},
            format="json",
        )
        force_authenticate(request, user=self.tenant)

        response = booking_send_message(request, self.booking.id)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["text"], "I am interested in this room")

    def test_ut32_sender_can_update_own_booking_message(self):
        """Validate sender can update own booking message (UT32)"""
        msg = BookingMessage.objects.create(
            request=self.booking,
            sender=self.tenant,
            text="Old message",
        )

        request = self.factory.patch(
            f"/api/booking-messages/{msg.id}/update/",
            {"text": "Updated message"},
            format="json",
        )
        force_authenticate(request, user=self.tenant)

        response = booking_update_message(request, msg.id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["detail"], "Message updated successfully.")

    def test_ut33_other_user_cannot_update_message(self):
        """Validate other user cannot update message (UT33)"""
        msg = BookingMessage.objects.create(
            request=self.booking,
            sender=self.tenant,
            text="Tenant message",
        )

        request = self.factory.patch(
            f"/api/booking-messages/{msg.id}/update/",
            {"text": "Hacked"},
            format="json",
        )
        force_authenticate(request, user=self.owner)

        response = booking_update_message(request, msg.id)

        self.assertEqual(response.status_code, 403)

    def test_ut34_sender_can_delete_own_booking_message(self):
        """Validate sender can delete own booking message (UT34)"""
        msg = BookingMessage.objects.create(
            request=self.booking,
            sender=self.tenant,
            text="Delete me",
        )

        request = self.factory.delete(f"/api/booking-messages/{msg.id}/delete/")
        force_authenticate(request, user=self.tenant)

        response = booking_delete_message(request, msg.id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["detail"], "Message deleted successfully.")

    def test_ut35_owner_accept_booking_creates_contract(self):
        """Validate owner accepting booking creates contract (UT35)"""
        request = self.factory.post(
            f"/api/owner/booking-requests/{self.booking.id}/status/",
            {"status": "accepted"},
            format="json",
        )
        force_authenticate(request, user=self.owner)

        response = owner_set_booking_status(request, self.booking.id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "accepted")
        self.assertEqual(response.data["contract_created"], True)
        self.assertTrue(response.data["contract_link"])

        contract = RentalContract.objects.filter(booking=self.booking).first()
        self.assertIsNotNone(contract)
        self.assertEqual(contract.status, "pending_tenant")
        self.assertEqual(contract.owner, self.owner)
        self.assertEqual(contract.tenant, self.tenant)
        self.assertEqual(contract.listing, self.listing)

    def test_ut36_owner_reject_booking_updates_status(self):
        """Validate owner can reject booking (UT36)"""
        request = self.factory.post(
            f"/api/owner/booking-requests/{self.booking.id}/status/",
            {"status": "rejected"},
            format="json",
        )
        force_authenticate(request, user=self.owner)

        response = owner_set_booking_status(request, self.booking.id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "rejected")

    def test_ut37_invalid_booking_status_fails(self):
        """Validate invalid booking status is rejected (UT37)"""
        request = self.factory.post(
            f"/api/owner/booking-requests/{self.booking.id}/status/",
            {"status": "wrongstatus"},
            format="json",
        )
        force_authenticate(request, user=self.owner)

        response = owner_set_booking_status(request, self.booking.id)

        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.data)

    def test_ut38_non_owner_cannot_change_booking_status(self):
        """Validate non-owner cannot change booking status (UT38)"""
        request = self.factory.post(
            f"/api/owner/booking-requests/{self.booking.id}/status/",
            {"status": "accepted"},
            format="json",
        )
        force_authenticate(request, user=self.tenant)

        response = owner_set_booking_status(request, self.booking.id)

        self.assertEqual(response.status_code, 403)

    def test_ut39_legacy_message_create_works(self):
        """Validate legacy booking message endpoint works (UT39)"""
        request = self.factory.post(
            "/api/booking-messages/create/",
            {
                "booking_id": self.booking.id,
                "text": "Legacy message",
            },
            format="json",
        )
        force_authenticate(request, user=self.tenant)

        response = create_message_legacy(request)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["text"], "Legacy message")