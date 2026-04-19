from datetime import date, timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from myapp.models import (
    Listing,
    BookingPayment,
    BookingRequest,
    RentalContract,
)

User = get_user_model()


@override_settings(
    ESEWA_PRODUCT_CODE="EPAYTEST",
    ESEWA_SECRET_KEY="secret",
    ESEWA_SUCCESS_URL="http://localhost:8000/api/payments/esewa/success/",
    ESEWA_FAILURE_URL="http://localhost:8000/api/payments/esewa/failure/",
    ESEWA_PAYMENT_URL="https://rc-epay.esewa.com.np/api/epay/main/v2/form",
    ESEWA_STATUS_URL="https://rc.esewa.com.np/api/epay/transaction/status/",
)
class EsewaPaymentViewsTests(APITestCase):
    def setUp(self):
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
        self.owner = User.objects.create_user(
            username="owner1",
            email="owner1@example.com",
            password="TestPass123!",
            role="owner",
        )
        self.admin = User.objects.create_user(
            username="admin1",
            email="admin1@example.com",
            password="TestPass123!",
            role="admin",
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
            tenant_signed=True,
            status="pending_owner",
        )

        self.payment = BookingPayment.objects.create(
            tenant=self.tenant,
            owner=self.owner,
            listing=self.listing,
            amount=12000,
            transaction_uuid="test-uuid-123",
            product_code="EPAYTEST",
            payment_status="PENDING",
            owner_payout_status="pending",
            payment_month="April 2026",
        )

    # -----------------------------
    # INITIATE PAYMENT
    # -----------------------------
    def test_ut01_tenant_can_initiate_esewa_payment(self):
        self.client.force_authenticate(user=self.tenant)

        url = reverse("initiate_esewa_booking_payment")
        payload = {
            "listing_id": self.listing.id,
            "amount": "12000.00",
            "payment_month": "May 2026",
        }

        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("payment_url", response.data)
        self.assertIn("form_fields", response.data)
        self.assertIn("payment", response.data)

    def test_ut02_non_tenant_cannot_initiate_payment(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("initiate_esewa_booking_payment")
        response = self.client.post(
            url,
            {"listing_id": self.listing.id, "amount": "12000"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["detail"], "Only tenant can start eSewa payment.")

    def test_ut03_payment_requires_listing_id(self):
        self.client.force_authenticate(user=self.tenant)

        url = reverse("initiate_esewa_booking_payment")
        response = self.client.post(url, {"amount": "12000"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "listing_id is required.")

    def test_ut04_payment_requires_amount(self):
        self.client.force_authenticate(user=self.tenant)

        url = reverse("initiate_esewa_booking_payment")
        response = self.client.post(url, {"listing_id": self.listing.id}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "amount is required.")

    def test_ut05_payment_rejects_invalid_amount(self):
        self.client.force_authenticate(user=self.tenant)

        url = reverse("initiate_esewa_booking_payment")
        response = self.client.post(
            url,
            {"listing_id": self.listing.id, "amount": "abc"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Invalid amount.")

    def test_ut06_payment_rejects_zero_or_negative_amount(self):
        self.client.force_authenticate(user=self.tenant)

        url = reverse("initiate_esewa_booking_payment")
        response = self.client.post(
            url,
            {"listing_id": self.listing.id, "amount": "0"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Amount must be greater than zero.")

    def test_ut07_payment_rejects_missing_listing(self):
        self.client.force_authenticate(user=self.tenant)

        url = reverse("initiate_esewa_booking_payment")
        response = self.client.post(
            url,
            {"listing_id": 99999, "amount": "12000"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["detail"], "Listing not found.")

    def test_ut08_payment_requires_owner_accepted_booking(self):
        booking2 = BookingRequest.objects.create(
            listing=self.listing,
            tenant=self.tenant2,
            status="pending",
        )
        RentalContract.objects.create(
            booking=booking2,
            listing=self.listing,
            owner=self.owner,
            tenant=self.tenant2,
            rent_amount=12000,
            security_deposit=5000,
            payment_due_day=5,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=30),
            tenant_signed=True,
            status="pending_owner",
        )

        self.client.force_authenticate(user=self.tenant2)

        url = reverse("initiate_esewa_booking_payment")
        response = self.client.post(
            url,
            {"listing_id": self.listing.id, "amount": "12000"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"],
            "Payment is only allowed after the owner accepts your booking request."
        )

    def test_ut09_payment_requires_contract(self):
        listing2 = Listing.objects.create(
            owner=self.owner,
            title="Room B",
            description="Another room",
            property_type="room",
            price_per_month=10000,
            location="Pokhara",
        )
        BookingRequest.objects.create(
            listing=listing2,
            tenant=self.tenant,
            status="accepted",
        )

        self.client.force_authenticate(user=self.tenant)

        url = reverse("initiate_esewa_booking_payment")
        response = self.client.post(
            url,
            {"listing_id": listing2.id, "amount": "10000"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"],
            "No rental agreement found for this property yet."
        )

    def test_ut10_payment_requires_tenant_signed_contract(self):
        self.contract.tenant_signed = False
        self.contract.save()

        self.client.force_authenticate(user=self.tenant)

        url = reverse("initiate_esewa_booking_payment")
        response = self.client.post(
            url,
            {"listing_id": self.listing.id, "amount": "12000"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"],
            "Please accept the rental agreement before payment."
        )

    def test_ut11_payment_requires_pending_owner_contract_status(self):
        self.contract.status = "draft"
        self.contract.save()

        self.client.force_authenticate(user=self.tenant)

        url = reverse("initiate_esewa_booking_payment")
        response = self.client.post(
            url,
            {"listing_id": self.listing.id, "amount": "12000"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"],
            "Payment is only available after you accept the agreement."
        )

    def test_ut12_payment_prevents_duplicate_monthly_payment(self):
        BookingPayment.objects.create(
            tenant=self.tenant,
            owner=self.owner,
            listing=self.listing,
            amount=12000,
            transaction_uuid="complete-uuid-001",
            product_code="EPAYTEST",
            payment_status="COMPLETE",
            owner_payout_status="paid",
            payment_month="May 2026",
        )

        self.client.force_authenticate(user=self.tenant)

        url = reverse("initiate_esewa_booking_payment")
        response = self.client.post(
            url,
            {
                "listing_id": self.listing.id,
                "amount": "12000",
                "payment_month": "May 2026",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already completed", response.data["detail"])

    # -----------------------------
    # PAYMENT LISTS
    # -----------------------------
    def test_ut13_tenant_can_view_own_booking_payments(self):
        self.client.force_authenticate(user=self.tenant)

        url = reverse("my_booking_payments")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_ut14_non_tenant_cannot_view_own_booking_payments(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("my_booking_payments")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["detail"], "Only tenant can view booking payments.")

    def test_ut15_admin_can_view_all_booking_payments(self):
        self.client.force_authenticate(user=self.admin)

        url = reverse("admin_booking_payments")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_ut16_non_admin_cannot_view_all_booking_payments(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("admin_booking_payments")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["detail"], "Only admin can view booking payments.")

    def test_ut17_owner_can_view_owner_booking_payments(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_booking_payments")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_ut18_non_owner_cannot_view_owner_booking_payments(self):
        self.client.force_authenticate(user=self.tenant)

        url = reverse("owner_booking_payments")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["detail"], "Only owner can view this.")

    # -----------------------------
    # ADMIN OWNER PAYOUT
    # -----------------------------
    def test_ut19_admin_can_mark_owner_payout_paid(self):
        self.payment.payment_status = "COMPLETE"
        self.payment.owner_payout_status = "pending"
        self.payment.save()

        self.client.force_authenticate(user=self.admin)

        url = reverse("mark_owner_booking_paid", args=[self.payment.id])
        response = self.client.patch(
            url,
            {"owner_payout_note": "Paid by admin"},
            format="json",
        )
        self.payment.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.payment.owner_payout_status, "paid")

    def test_ut20_non_admin_cannot_mark_owner_payout_paid(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("mark_owner_booking_paid", args=[self.payment.id])
        response = self.client.patch(
            url,
            {"owner_payout_note": "Paid by owner"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["detail"], "Only admin can mark owner payout.")

    def test_ut21_mark_owner_payout_fails_for_missing_payment(self):
        self.client.force_authenticate(user=self.admin)

        url = reverse("mark_owner_booking_paid", args=[99999])
        response = self.client.patch(
            url,
            {"owner_payout_note": "Paid"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["detail"], "Booking payment not found.")

    def test_ut22_mark_owner_payout_requires_complete_payment(self):
        self.payment.payment_status = "PENDING"
        self.payment.owner_payout_status = "pending"
        self.payment.save()

        self.client.force_authenticate(user=self.admin)

        url = reverse("mark_owner_booking_paid", args=[self.payment.id])
        response = self.client.patch(
            url,
            {"owner_payout_note": "Paid"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"],
            "Owner payout can only be marked after payment is complete."
        )

    def test_ut23_mark_owner_payout_rejects_already_paid(self):
        self.payment.payment_status = "COMPLETE"
        self.payment.owner_payout_status = "paid"
        self.payment.save()

        self.client.force_authenticate(user=self.admin)

        url = reverse("mark_owner_booking_paid", args=[self.payment.id])
        response = self.client.patch(
            url,
            {"owner_payout_note": "Paid again"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"],
            "Owner payout is already marked as paid."
        )

    # -----------------------------
    # ESEWA SUCCESS / FAILURE
    # -----------------------------
    @patch("myapp.view.esewa_payment_views.requests.get")
    @patch("myapp.view.esewa_payment_views.decode_esewa_data")
    def test_ut24_esewa_success_marks_payment_complete(
        self, mock_decode_esewa_data, mock_requests_get
    ):
        self.payment.transaction_uuid = "success-uuid-001"
        self.payment.payment_status = "PENDING"
        self.payment.owner_payout_status = "pending"
        self.payment.save()

        self.contract.tenant_signed = True
        self.contract.status = "pending_owner"
        self.contract.save()

        mock_decode_esewa_data.return_value = {
            "transaction_uuid": "success-uuid-001",
            "total_amount": "12000.00",
            "transaction_code": "TXN123",
            "status": "COMPLETE",
        }

        mock_requests_get.return_value.json.return_value = {
            "status": "COMPLETE",
            "ref_id": "REF123",
        }

        url = reverse("esewa_success")
        response = self.client.get(url, {"data": "encoded-data"})

        self.payment.refresh_from_db()
        self.contract.refresh_from_db()
        self.listing.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertEqual(self.payment.payment_status, "COMPLETE")
        self.assertEqual(self.payment.owner_payout_status, "paid")
        self.assertEqual(self.contract.status, "active")
        self.assertEqual(self.listing.status, "booked")

    def test_ut25_esewa_success_requires_data_param(self):
        url = reverse("esewa_success")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Missing transaction details.")

    @patch("myapp.view.esewa_payment_views.decode_esewa_data")
    def test_ut26_esewa_success_rejects_invalid_decoded_data(self, mock_decode_esewa_data):
        mock_decode_esewa_data.return_value = None

        url = reverse("esewa_success")
        response = self.client.get(url, {"data": "bad-data"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Invalid eSewa response data.")

    @patch("myapp.view.esewa_payment_views.decode_esewa_data")
    def test_ut27_esewa_success_requires_transaction_uuid_and_total_amount(self, mock_decode_esewa_data):
        mock_decode_esewa_data.return_value = {"status": "COMPLETE"}

        url = reverse("esewa_success")
        response = self.client.get(url, {"data": "encoded-data"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Missing transaction_uuid or total_amount", response.data["detail"])

    @patch("myapp.view.esewa_payment_views.requests.get")
    @patch("myapp.view.esewa_payment_views.decode_esewa_data")
    def test_ut28_esewa_success_returns_404_for_missing_payment(
        self, mock_decode_esewa_data, mock_requests_get
    ):
        mock_decode_esewa_data.return_value = {
            "transaction_uuid": "missing-uuid",
            "total_amount": "12000.00",
            "transaction_code": "TXN999",
            "status": "COMPLETE",
        }
        mock_requests_get.return_value.json.return_value = {
            "status": "COMPLETE",
            "ref_id": "REF999",
        }

        url = reverse("esewa_success")
        response = self.client.get(url, {"data": "encoded-data"})

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["detail"], "Payment record not found.")

    @patch("myapp.view.esewa_payment_views.requests.get")
    @patch("myapp.view.esewa_payment_views.decode_esewa_data")
    def test_ut29_esewa_success_handles_status_check_failure(
        self, mock_decode_esewa_data, mock_requests_get
    ):
        self.payment.transaction_uuid = "status-fail-uuid"
        self.payment.save()

        mock_decode_esewa_data.return_value = {
            "transaction_uuid": "status-fail-uuid",
            "total_amount": "12000.00",
            "transaction_code": "TXN500",
            "status": "COMPLETE",
        }
        mock_requests_get.side_effect = Exception("Connection failed")

        url = reverse("esewa_success")
        response = self.client.get(url, {"data": "encoded-data"})

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn("Status check failed", response.data["detail"])

    def test_ut30_esewa_failure_redirects(self):
        url = reverse("esewa_failure")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_302_FOUND)

    # -----------------------------
    # AUTH
    # -----------------------------
    def test_ut31_unauthenticated_user_cannot_view_my_booking_payments(self):
        url = reverse("my_booking_payments")
        response = self.client.get(url)

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
        )

    def test_ut32_unauthenticated_user_cannot_view_admin_booking_payments(self):
        url = reverse("admin_booking_payments")
        response = self.client.get(url)

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
        )

    def test_ut33_unauthenticated_user_cannot_view_owner_booking_payments(self):
        url = reverse("owner_booking_payments")
        response = self.client.get(url)

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
        )