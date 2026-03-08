from django.utils import timezone
from django.db import transaction

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from myapp.models import Listing, BookingRequest, BookingMessage, Notification
from myapp.serializers import (
    BookingRequestCreateSerializer,
    BookingRequestListSerializer,
    BookingMessageSerializer,
)


# =========================
# Role helpers
# =========================
def is_owner(user):
    return str(getattr(user, "role", "")).lower() == "owner"


def is_tenant(user):
    return str(getattr(user, "role", "")).lower() == "tenant"


def _create_notification(user, title, message, link=""):
    try:
        Notification.objects.create(
            user=user,
            title=title,
            message=message,
            link=link or "",
        )
    except Exception:
        pass


# =========================
# TENANT: Create booking request
# POST /api/tenant/booking-requests/create/
# body can be:
# { "listing_id": 1, "first_message": "Hello" }
# or
# { "listing": 1, "message": "Hello" }
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def tenant_create_booking_request(request):
    if not is_tenant(request.user):
        return Response(
            {"detail": "Only TENANT can request booking."},
            status=status.HTTP_403_FORBIDDEN,
        )

    data = request.data.copy()

    # accept both field formats
    if "listing_id" not in data and "listing" in data:
        data["listing_id"] = data.get("listing")

    if "first_message" not in data and "message" in data:
        data["first_message"] = data.get("message")

    ser = BookingRequestCreateSerializer(data=data, context={"request": request})
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    booking = ser.save()

    # create notification for owner
    owner = getattr(booking.listing, "owner", None)
    if owner:
        tenant_label = request.user.email or request.user.username or "A tenant"
        listing_label = (
            getattr(booking.listing, "title", None)
            or getattr(booking.listing, "property_name", None)
            or getattr(booking.listing, "name", None)
            or f"Listing #{booking.listing.id}"
        )

        _create_notification(
            user=owner,
            title="New booking request",
            message=f"{tenant_label} sent a booking request for {listing_label}.",
            link=f"/owner/messages?open={booking.id}",
        )

    return Response(
        {
            "id": booking.id,
            "status": booking.status,
            "created_at": booking.created_at,
        },
        status=status.HTTP_201_CREATED,
    )


# =========================
# TENANT: My booking requests
# GET /api/tenant/booking-requests/
# =========================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def tenant_my_booking_requests(request):
    if not is_tenant(request.user):
        return Response(
            {"detail": "Only TENANT can view this."},
            status=status.HTTP_403_FORBIDDEN,
        )

    qs = (
        BookingRequest.objects.filter(tenant=request.user)
        .select_related("listing", "listing__owner", "tenant")
        .order_by("-created_at")
    )

    return Response(
        BookingRequestListSerializer(qs, many=True, context={"request": request}).data,
        status=status.HTTP_200_OK,
    )


# =========================
# OWNER: Inbox requests for my listings
# GET /api/owner/booking-requests/
# =========================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def owner_booking_inbox(request):
    if not is_owner(request.user):
        return Response(
            {"detail": "Only OWNER can view inbox."},
            status=status.HTTP_403_FORBIDDEN,
        )

    qs = (
        BookingRequest.objects.filter(listing__owner=request.user)
        .select_related("listing", "listing__owner", "tenant")
        .order_by("-created_at")
    )

    return Response(
        BookingRequestListSerializer(qs, many=True, context={"request": request}).data,
        status=status.HTTP_200_OK,
    )


# =========================
# BOTH: View messages for a booking request
# GET /api/booking-requests/<booking_id>/messages/
# =========================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def booking_messages(request, booking_id):
    try:
        booking = BookingRequest.objects.select_related(
            "listing", "tenant", "listing__owner"
        ).get(id=booking_id)
    except BookingRequest.DoesNotExist:
        return Response(
            {"detail": "Booking request not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if booking.tenant_id != request.user.id and booking.listing.owner_id != request.user.id:
        return Response(
            {"detail": "Not allowed."},
            status=status.HTTP_403_FORBIDDEN,
        )

    msgs = booking.messages.select_related("sender").order_by("created_at")

    return Response(
        BookingMessageSerializer(msgs, many=True, context={"request": request}).data,
        status=status.HTTP_200_OK,
    )


# =========================
# BOTH: Send a message
# POST /api/booking-requests/<booking_id>/messages/send/
# body:
# { "text": "Hello" } OR { "message": "Hello" } OR { "body": "Hello" }
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def booking_send_message(request, booking_id):
    text = str(
        request.data.get("text")
        or request.data.get("message")
        or request.data.get("body")
        or ""
    ).strip()

    if not text:
        return Response(
            {"detail": "text is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        booking = BookingRequest.objects.select_related(
            "listing", "tenant", "listing__owner"
        ).get(id=booking_id)
    except BookingRequest.DoesNotExist:
        return Response(
            {"detail": "Booking request not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if booking.tenant_id != request.user.id and booking.listing.owner_id != request.user.id:
        return Response(
            {"detail": "Not allowed."},
            status=status.HTTP_403_FORBIDDEN,
        )

    # support different possible field names in model
    try:
        msg = BookingMessage.objects.create(
            request=booking,
            sender=request.user,
            text=text,
        )
    except TypeError:
        try:
            msg = BookingMessage.objects.create(
                booking=booking,
                sender=request.user,
                text=text,
            )
        except TypeError:
            msg = BookingMessage.objects.create(
                booking=booking,
                sender=request.user,
                message=text,
            )

    # create notification for the other side
    receiver = booking.listing.owner if request.user.id == booking.tenant_id else booking.tenant
    sender_label = request.user.email or request.user.username or "Someone"
    listing_label = (
        getattr(booking.listing, "title", None)
        or getattr(booking.listing, "property_name", None)
        or getattr(booking.listing, "name", None)
        or f"Listing #{booking.listing.id}"
    )

    if receiver:
        _create_notification(
            user=receiver,
            title="New booking message",
            message=f"{sender_label} sent a new message about {listing_label}.",
            link=(
                f"/owner/messages?open={booking.id}"
                if str(getattr(receiver, "role", "")).lower() == "owner"
                else f"/tenant/inbox?open={booking.id}"
            ),
        )

    return Response(
        BookingMessageSerializer(msg, context={"request": request}).data,
        status=status.HTTP_201_CREATED,
    )


# =========================
# OWNER: Accept / Reject booking
# POST /api/owner/booking-requests/<booking_id>/status/
# body: { "status": "accepted" } or { "status": "rejected" }
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def owner_set_booking_status(request, booking_id):
    if not is_owner(request.user):
        return Response(
            {"detail": "Only OWNER can update status."},
            status=status.HTTP_403_FORBIDDEN,
        )

    new_status = request.data.get("status")

    accepted_val = getattr(BookingRequest, "STATUS_ACCEPTED", "accepted")
    rejected_val = getattr(BookingRequest, "STATUS_REJECTED", "rejected")

    if new_status not in [accepted_val, rejected_val, "accepted", "rejected"]:
        return Response(
            {"detail": "status must be 'accepted' or 'rejected'."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if new_status == "accepted":
        new_status = accepted_val
    if new_status == "rejected":
        new_status = rejected_val

    try:
        booking = BookingRequest.objects.select_related("listing", "tenant").get(
            id=booking_id,
            listing__owner=request.user,
        )
    except BookingRequest.DoesNotExist:
        return Response(
            {"detail": "Booking request not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    listing = booking.listing

    with transaction.atomic():
        booking.status = new_status
        booking.decided_at = timezone.now()
        booking.save(update_fields=["status", "decided_at"])

        if new_status == accepted_val:
            listing.is_available = False
            listing.save(update_fields=["is_available"])

            BookingRequest.objects.filter(listing=listing).exclude(id=booking.id).exclude(
                status=rejected_val
            ).update(
                status=rejected_val,
                decided_at=timezone.now(),
            )

        elif new_status == rejected_val:
            still_accepted = BookingRequest.objects.filter(
                listing=listing,
                status=accepted_val,
            ).exists()

            if not still_accepted:
                listing.is_available = True
                listing.save(update_fields=["is_available"])

    # notify tenant about status update
    tenant_user = booking.tenant
    listing_label = (
        getattr(listing, "title", None)
        or getattr(listing, "property_name", None)
        or getattr(listing, "name", None)
        or f"Listing #{listing.id}"
    )

    if tenant_user:
        _create_notification(
            user=tenant_user,
            title="Booking request updated",
            message=f"Your booking request for {listing_label} was {booking.status}.",
            link=f"/tenant/inbox?open={booking.id}",
        )

    return Response(
        {
            "id": booking.id,
            "status": booking.status,
            "listing_id": listing.id,
            "listing_is_available": listing.is_available,
        },
        status=status.HTTP_200_OK,
    )


# =========================
# Legacy endpoint
# POST /api/booking-messages/create/
# body: { "booking_id": 1, "text": "Hello" }
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_message_legacy(request):
    booking_id = request.data.get("booking_id")
    text = str(
        request.data.get("text")
        or request.data.get("message")
        or request.data.get("body")
        or ""
    ).strip()

    if not booking_id or not text:
        return Response(
            {"detail": "booking_id and text are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        booking = BookingRequest.objects.select_related(
            "listing", "tenant", "listing__owner"
        ).get(id=booking_id)
    except BookingRequest.DoesNotExist:
        return Response(
            {"detail": "Booking request not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if booking.tenant_id != request.user.id and booking.listing.owner_id != request.user.id:
        return Response(
            {"detail": "Not allowed."},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        msg = BookingMessage.objects.create(
            request=booking,
            sender=request.user,
            text=text,
        )
    except TypeError:
        try:
            msg = BookingMessage.objects.create(
                booking=booking,
                sender=request.user,
                text=text,
            )
        except TypeError:
            msg = BookingMessage.objects.create(
                booking=booking,
                sender=request.user,
                message=text,
            )

    # create notification for other side
    receiver = booking.listing.owner if request.user.id == booking.tenant_id else booking.tenant
    sender_label = request.user.email or request.user.username or "Someone"
    listing_label = (
        getattr(booking.listing, "title", None)
        or getattr(booking.listing, "property_name", None)
        or getattr(booking.listing, "name", None)
        or f"Listing #{booking.listing.id}"
    )

    if receiver:
        _create_notification(
            user=receiver,
            title="New booking message",
            message=f"{sender_label} sent a new message about {listing_label}.",
            link=(
                f"/owner/messages?open={booking.id}"
                if str(getattr(receiver, "role", "")).lower() == "owner"
                else f"/tenant/inbox?open={booking.id}"
            ),
        )

    return Response(
        BookingMessageSerializer(msg, context={"request": request}).data,
        status=status.HTTP_201_CREATED,
    )