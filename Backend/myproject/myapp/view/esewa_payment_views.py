import base64
import hashlib
import hmac
import json
import uuid
import requests

from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.shortcuts import redirect
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..models import Listing, BookingPayment, Notification
from ..serializers import BookingPaymentSerializer


def is_tenant(user):
    return str(getattr(user, "role", "")).lower() == "tenant"


def is_admin(user):
    return str(getattr(user, "role", "")).lower() == "admin"


def is_owner(user):
    return str(getattr(user, "role", "")).lower() == "owner"


def create_notification(user, title, message, link=""):
    try:
        Notification.objects.create(
            user=user,
            title=title,
            message=message,
            link=link or "",
        )
    except Exception:
        pass


def generate_esewa_signature(total_amount, transaction_uuid, product_code, secret_key):
    message = f"total_amount={total_amount},transaction_uuid={transaction_uuid},product_code={product_code}"
    digest = hmac.new(
        secret_key.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256
    ).digest()
    return base64.b64encode(digest).decode("utf-8")


def decode_esewa_data(encoded_data):
    try:
        padded = encoded_data + "=" * (-len(encoded_data) % 4)
        decoded_bytes = base64.urlsafe_b64decode(padded)
        decoded_str = decoded_bytes.decode("utf-8")
        return json.loads(decoded_str)
    except Exception:
        return None


def to_money(value):
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def apply_payment_split(payment):
    """
    Business rule:
    - First COMPLETE payment for same tenant + same listing:
      Admin gets 20%, Owner gets 80%
    - Later COMPLETE payments for same tenant + same listing:
      Admin gets 0%, Owner gets 100%
    """
    previous_success_exists = BookingPayment.objects.filter(
        tenant=payment.tenant,
        listing=payment.listing,
        payment_status__iexact="COMPLETE",
    ).exclude(id=payment.id).exists()

    amount = to_money(payment.amount)

    if not previous_success_exists:
        payment.is_first_property_payment = True
        payment.admin_share_percent = to_money("20.00")
        payment.admin_share_amount = to_money(amount * Decimal("0.20"))
        payment.owner_share_percent = to_money("80.00")
        payment.owner_share_amount = to_money(amount * Decimal("0.80"))
    else:
        payment.is_first_property_payment = False
        payment.admin_share_percent = to_money("0.00")
        payment.admin_share_amount = to_money("0.00")
        payment.owner_share_percent = to_money("100.00")
        payment.owner_share_amount = amount


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def initiate_esewa_booking_payment(request):
    if not is_tenant(request.user):
        return Response(
            {"detail": "Only tenant can start eSewa payment."},
            status=status.HTTP_403_FORBIDDEN
        )

    listing_id = request.data.get("listing_id")
    amount = request.data.get("amount")
    payment_month = request.data.get("payment_month", "").strip()

    if not listing_id:
        return Response(
            {"detail": "listing_id is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not amount:
        return Response(
            {"detail": "amount is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        amount_decimal = to_money(amount)
    except Exception:
        return Response(
            {"detail": "Invalid amount."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if amount_decimal <= 0:
        return Response(
            {"detail": "Amount must be greater than zero."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        listing = Listing.objects.get(id=listing_id)
    except Listing.DoesNotExist:
        return Response(
            {"detail": "Listing not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    owner = getattr(listing, "owner", None)
    if not owner:
        return Response(
            {"detail": "Listing owner not found."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Prevent duplicate successful payment for same tenant + same property + same month
    if payment_month:
        already_paid_same_month = BookingPayment.objects.filter(
            tenant=request.user,
            listing=listing,
            payment_month__iexact=payment_month,
            payment_status__iexact="COMPLETE",
        ).exists()

        if already_paid_same_month:
            return Response(
                {"detail": f"Payment for {payment_month} is already completed for this property."},
                status=status.HTTP_400_BAD_REQUEST
            )

    transaction_uuid = str(uuid.uuid4())
    product_code = settings.ESEWA_PRODUCT_CODE
    total_amount = str(amount_decimal)

    signature = generate_esewa_signature(
        total_amount=total_amount,
        transaction_uuid=transaction_uuid,
        product_code=product_code,
        secret_key=settings.ESEWA_SECRET_KEY,
    )

    payment = BookingPayment.objects.create(
        tenant=request.user,
        owner=owner,
        listing=listing,
        amount=amount_decimal,
        transaction_uuid=transaction_uuid,
        product_code=product_code,
        payment_month=payment_month,
        payment_status="PENDING",
        admin_share_percent=to_money("0.00"),
        admin_share_amount=to_money("0.00"),
        owner_share_percent=to_money("0.00"),
        owner_share_amount=to_money("0.00"),
        owner_payout_status="pending",
        is_first_property_payment=False,
    )

    data = {
        "amount": total_amount,
        "tax_amount": "0",
        "total_amount": total_amount,
        "transaction_uuid": transaction_uuid,
        "product_code": product_code,
        "product_service_charge": "0",
        "product_delivery_charge": "0",
        "success_url": settings.ESEWA_SUCCESS_URL,
        "failure_url": settings.ESEWA_FAILURE_URL,
        "signed_field_names": "total_amount,transaction_uuid,product_code",
        "signature": signature,
    }

    return Response(
        {
            "payment_url": settings.ESEWA_PAYMENT_URL,
            "form_fields": data,
            "payment": BookingPaymentSerializer(payment).data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
def esewa_success(request):
    encoded_data = request.GET.get("data")

    if not encoded_data:
        return Response(
            {"detail": "Missing transaction details."},
            status=status.HTTP_400_BAD_REQUEST
        )

    decoded_data = decode_esewa_data(encoded_data)

    if not decoded_data:
        return Response(
            {"detail": "Invalid eSewa response data."},
            status=status.HTTP_400_BAD_REQUEST
        )

    transaction_uuid = decoded_data.get("transaction_uuid")
    total_amount = decoded_data.get("total_amount") or decoded_data.get("amount")
    transaction_code = decoded_data.get("transaction_code")
    payment_status_from_esewa = decoded_data.get("status")

    if not transaction_uuid or not total_amount:
        return Response(
            {
                "detail": "Missing transaction_uuid or total_amount in decoded eSewa data.",
                "decoded_data": decoded_data,
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    status_url = (
        f"{settings.ESEWA_STATUS_URL}"
        f"?product_code={settings.ESEWA_PRODUCT_CODE}"
        f"&total_amount={total_amount}"
        f"&transaction_uuid={transaction_uuid}"
    )

    try:
        res = requests.get(status_url, timeout=20)
        status_data = res.json()
    except Exception as e:
        return Response(
            {"detail": f"Status check failed: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    try:
        payment = BookingPayment.objects.get(transaction_uuid=transaction_uuid)
    except BookingPayment.DoesNotExist:
        return Response(
            {"detail": "Payment record not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    final_status = str(
        status_data.get("status") or payment_status_from_esewa or "PENDING"
    ).upper()

    payment.raw_response = {
        "decoded_data": decoded_data,
        "status_check": status_data,
    }
    payment.payment_status = final_status
    payment.ref_id = status_data.get("ref_id") or transaction_code or ""

    if final_status == "COMPLETE":
        # Safety: if same transaction is hit again, do not recalculate repeatedly
        if not payment.verified_at:
            apply_payment_split(payment)
            payment.verified_at = timezone.now()
            payment.save()
        else:
            payment.save(update_fields=["raw_response", "payment_status", "ref_id"])

        create_notification(
            user=payment.tenant,
            title="Booking payment successful",
            message=(
                f"Your payment of Rs. {payment.amount} for "
                f"{getattr(payment.listing, 'title', 'property')} "
                f"for {payment.payment_month or 'this period'} was successful."
            ),
            link="/tenant/payment-success"
        )

        create_notification(
            user=payment.owner,
            title="Tenant payment received",
            message=(
                f"Tenant {getattr(payment.tenant, 'username', 'Tenant')} paid "
                f"Rs. {payment.amount} for {getattr(payment.listing, 'title', 'your property')} "
                f"for {payment.payment_month or 'this period'}. "
                f"Owner share: Rs. {payment.owner_share_amount}."
            ),
            link="/owner/booking-payments/"
        )

        admin_users = type(payment.tenant).objects.filter(role__iexact="admin")
        for admin in admin_users:
            create_notification(
                user=admin,
                title="Booking payment completed",
                message=(
                    f"Tenant {getattr(payment.tenant, 'username', 'Tenant')} paid "
                    f"Rs. {payment.amount} for {getattr(payment.listing, 'title', 'property')} "
                    f"for {payment.payment_month or 'this period'}. "
                    f"Admin share: Rs. {payment.admin_share_amount}, "
                    f"Owner share: Rs. {payment.owner_share_amount}."
                ),
                link="/admin/booking-payments/"
            )

        return redirect("http://localhost:3000/tenant/payment-success")

    # Do not mark verified_at for failed/pending
    payment.save(update_fields=["raw_response", "payment_status", "ref_id"])
    return redirect("http://localhost:3000/tenant/payment-failed")


@api_view(["GET"])
def esewa_failure(request):
    return redirect("http://localhost:3000/tenant/payment-failed")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_booking_payments(request):
    if not is_tenant(request.user):
        return Response(
            {"detail": "Only tenant can view booking payments."},
            status=status.HTTP_403_FORBIDDEN
        )

    qs = BookingPayment.objects.filter(tenant=request.user).order_by("-created_at")
    serializer = BookingPaymentSerializer(qs, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_booking_payments(request):
    if not is_admin(request.user):
        return Response(
            {"detail": "Only admin can view booking payments."},
            status=status.HTTP_403_FORBIDDEN
        )

    qs = BookingPayment.objects.all().order_by("-created_at")
    serializer = BookingPaymentSerializer(qs, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def mark_owner_booking_paid(request, payment_id):
    if not is_admin(request.user):
        return Response(
            {"detail": "Only admin can mark owner payout."},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        payment = BookingPayment.objects.get(id=payment_id)
    except BookingPayment.DoesNotExist:
        return Response(
            {"detail": "Booking payment not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    if str(payment.payment_status).upper() != "COMPLETE":
        return Response(
            {"detail": "Owner payout can only be marked after payment is complete."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if str(payment.owner_payout_status).lower() == "paid":
        return Response(
            {"detail": "Owner payout is already marked as paid."},
            status=status.HTTP_400_BAD_REQUEST
        )

    payment.owner_payout_status = "paid"
    payment.owner_payout_note = request.data.get("owner_payout_note", "")
    payment.owner_payout_date = timezone.now()
    payment.save()

    create_notification(
        user=payment.owner,
        title="Owner payout completed",
        message=(
            f"Your payout of Rs. {payment.owner_share_amount} for "
            f"{getattr(payment.listing, 'title', 'property')} has been sent."
        ),
        link="/owner/booking-payments/"
    )

    return Response(BookingPaymentSerializer(payment).data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def owner_booking_payments(request):
    if not is_owner(request.user):
        return Response(
            {"detail": "Only owner can view this."},
            status=status.HTTP_403_FORBIDDEN
        )

    qs = BookingPayment.objects.filter(owner=request.user).order_by("-created_at")
    serializer = BookingPaymentSerializer(qs, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)