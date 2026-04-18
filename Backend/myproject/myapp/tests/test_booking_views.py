from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from myapp.models import Listing, BookingRequest, BookingMessage
from myapp.view.booking_views import (
    tenant_create_booking_request,
    owner_booking_inbox,
    booking_messages,
    booking_send_message,
    owner_set_booking_status,
)

User = get_user_model()


class BookingModuleTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

        self.owner = User.objects.create_user(
            username="owner1",
            email="owner1@example.com",
            password="OwnerPass123"
        )
        self.owner.role = "owner"
        self.owner.is_email_verified = True
        self.owner.save()

        self.tenant = User.objects.create_user(
            username="tenant1",
            email="tenant1@example.com",
            password="TenantPass123"
        )
        self.tenant.role = "tenant"
        self.tenant.is_email_verified = True
        self.tenant.save()

        self.other_user = User.objects.create_user(
            username="other1",
            email="other1@example.com",
            password="OtherPass123"
        )
        self.other_user.role = "owner"
        self.other_user.is_email_verified = True
        self.other_user.save()

        self.listing = Listing.objects.create(
            owner=self.owner,
            title="Test Room",
            price_per_month=1000,
            is_available=True,
            status="available"
        )

        self.booking = BookingRequest.objects.create(
            listing=self.listing,
            tenant=self.tenant,
            status="pending"
        )

    def test_ut03_tenant_create_booking_request(self):
        """Validate tenant can create booking request (UT03)"""
        request = self.factory.post(
            "/api/tenant/booking-requests/create/",
            {
                "listing_id": self.listing.id,
                "first_message": "I want to book this room"
            },
            format="json"
        )
        force_authenticate(request, user=self.tenant)
        response = tenant_create_booking_request(request)

        self.assertEqual(response.status_code, 201)
        self.assertIn("id", response.data)
        self.assertEqual(response.data["status"], "pending")

    def test_ut04_owner_can_view_booking_inbox(self):
        """Validate owner can view booking inbox (UT04)"""
        request = self.factory.get("/api/owner/booking-requests/")
        force_authenticate(request, user=self.owner)
        response = owner_booking_inbox(request)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(response.data) >= 1)

    def test_ut05_tenant_can_send_booking_message(self):
        """Validate tenant can send booking message (UT05)"""
        request = self.factory.post(
            f"/api/booking-requests/{self.booking.id}/messages/send/",
            {"text": "Hello owner, I am interested."},
            format="json"
        )
        force_authenticate(request, user=self.tenant)
        response = booking_send_message(request, self.booking.id)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["text"], "Hello owner, I am interested.")

    def test_ut06_owner_can_accept_booking(self):
        """Validate owner can accept booking request (UT06)"""
        request = self.factory.post(
            f"/api/owner/booking-requests/{self.booking.id}/status/",
            {"status": "accepted"},
            format="json"
        )
        force_authenticate(request, user=self.owner)
        response = owner_set_booking_status(request, self.booking.id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "accepted")

    def test_ut07_owner_cannot_create_booking_request(self):
        """Validate owner cannot create tenant booking request (UT07)"""
        request = self.factory.post(
            "/api/tenant/booking-requests/create/",
            {
                "listing_id": self.listing.id,
                "first_message": "Trying booking as owner"
            },
            format="json"
        )
        force_authenticate(request, user=self.owner)
        response = tenant_create_booking_request(request)

        self.assertEqual(response.status_code, 403)

    def test_ut08_only_related_user_can_view_booking_messages(self):
        """Validate unrelated user cannot view booking messages (UT08)"""
        request = self.factory.get(f"/api/booking-requests/{self.booking.id}/messages/")
        force_authenticate(request, user=self.other_user)
        response = booking_messages(request, self.booking.id)

        self.assertEqual(response.status_code, 403)

    def test_ut09_owner_can_view_booking_messages(self):
        """Validate owner can view booking messages (UT09)"""
        BookingMessage.objects.create(
            request=self.booking,
            sender=self.tenant,
            text="Hello owner"
        )

        request = self.factory.get(f"/api/booking-requests/{self.booking.id}/messages/")
        force_authenticate(request, user=self.owner)
        response = booking_messages(request, self.booking.id)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(response.data) >= 1)

    def test_ut10_owner_can_reject_booking(self):
        """Validate owner can reject booking request (UT10)"""
        request = self.factory.post(
            f"/api/owner/booking-requests/{self.booking.id}/status/",
            {"status": "rejected"},
            format="json"
        )
        force_authenticate(request, user=self.owner)
        response = owner_set_booking_status(request, self.booking.id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "rejected")