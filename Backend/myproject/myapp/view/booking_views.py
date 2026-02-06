# myapp/view/booking_views.py
from django.utils import timezone
from django.db import transaction

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from myapp.models import Listing, BookingRequest, BookingMessage
from myapp.serializers import (
    BookingRequestCreateSerializer,
    BookingRequestListSerializer,
    BookingMessageSerializer,
)

# --------------------------
# Role helpers
# --------------------------
def is_owner(user):
    return getattr(user, "role", "") == "owner"

def is_tenant(user):
    return getattr(user, "role", "") == "tenant"


# =====================================================
# ✅ TENANT: Create booking request
# POST /api/tenant/booking-requests/create/
# body: { "listing_id": 1, "first_message": "Hi..." }
# =====================================================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def tenant_create_booking_request(request):
    if not is_tenant(request.user):
        return Response({"detail": "Only TENANT can request booking."}, status=status.HTTP_403_FORBIDDEN)

    ser = BookingRequestCreateSerializer(data=request.data, context={"request": request})
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    booking = ser.save()
    return Response(
        {"id": booking.id, "status": booking.status, "created_at": booking.created_at},
        status=status.HTTP_201_CREATED,
    )


# =====================================================
# ✅ TENANT: My booking requests
# GET /api/tenant/booking-requests/
# =====================================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def tenant_my_booking_requests(request):
    if not is_tenant(request.user):
        return Response({"detail": "Only TENANT can view this."}, status=status.HTTP_403_FORBIDDEN)

    qs = (
        BookingRequest.objects
        .filter(tenant=request.user)
        .select_related("listing", "listing__owner", "tenant")
        .order_by("-created_at")
    )
    return Response(BookingRequestListSerializer(qs, many=True, context={"request": request}).data)


# =====================================================
# ✅ OWNER: Inbox requests for my listings
# GET /api/owner/booking-requests/
# =====================================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def owner_booking_inbox(request):
    if not is_owner(request.user):
        return Response({"detail": "Only OWNER can view inbox."}, status=status.HTTP_403_FORBIDDEN)

    qs = (
        BookingRequest.objects
        .filter(listing__owner=request.user)
        .select_related("listing", "listing__owner", "tenant")
        .order_by("-created_at")
    )
    return Response(BookingRequestListSerializer(qs, many=True, context={"request": request}).data)


# =====================================================
# ✅ BOTH: View messages for a booking request
# GET /api/booking-requests/<booking_id>/messages/
# =====================================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def booking_messages(request, booking_id):
    try:
        booking = BookingRequest.objects.select_related("listing", "tenant", "listing__owner").get(id=booking_id)
    except BookingRequest.DoesNotExist:
        return Response({"detail": "Booking request not found."}, status=status.HTTP_404_NOT_FOUND)

    # allow only tenant or listing owner
    if booking.tenant_id != request.user.id and booking.listing.owner_id != request.user.id:
        return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

    # ✅ If your BookingMessage FK has related_name="messages"
    msgs = booking.messages.select_related("sender").order_by("created_at")
    return Response(BookingMessageSerializer(msgs, many=True, context={"request": request}).data)


# =====================================================
# ✅ BOTH: Send a message
# POST /api/booking-requests/<booking_id>/messages/send/
# body: { "text": "Hello" }  OR { "message": "Hello" }
# =====================================================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def booking_send_message(request, booking_id):
    text = str(
        request.data.get("text") or request.data.get("message") or request.data.get("body") or ""
    ).strip()

    if not text:
        return Response({"detail": "text is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        booking = BookingRequest.objects.select_related("listing", "tenant", "listing__owner").get(id=booking_id)
    except BookingRequest.DoesNotExist:
        return Response({"detail": "Booking request not found."}, status=status.HTTP_404_NOT_FOUND)

    if booking.tenant_id != request.user.id and booking.listing.owner_id != request.user.id:
        return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

    # ✅ Create message (robust: supports common field names)
    try:
        msg = BookingMessage.objects.create(request=booking, sender=request.user, text=text)
    except TypeError:
        try:
            msg = BookingMessage.objects.create(booking=booking, sender=request.user, text=text)
        except TypeError:
            msg = BookingMessage.objects.create(booking=booking, sender=request.user, message=text)

    return Response(BookingMessageSerializer(msg, context={"request": request}).data, status=status.HTTP_201_CREATED)


# =====================================================
# ✅ OWNER: Accept / Reject booking
# POST /api/owner/booking-requests/<booking_id>/status/
# body: { "status": "accepted" } or { "status": "rejected" }
#
# ✅ IMPORTANT:
# - accepted -> listing.is_available = False (remove from home)
# - rejected -> if no accepted booking exists -> listing.is_available = True (show again)
# =====================================================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def owner_set_booking_status(request, booking_id):
    if not is_owner(request.user):
        return Response({"detail": "Only OWNER can update status."}, status=status.HTTP_403_FORBIDDEN)

    new_status = request.data.get("status")

    # support both constant + raw strings
    accepted_val = getattr(BookingRequest, "STATUS_ACCEPTED", "accepted")
    rejected_val = getattr(BookingRequest, "STATUS_REJECTED", "rejected")

    if new_status not in [accepted_val, rejected_val, "accepted", "rejected"]:
        return Response({"detail": "status must be 'accepted' or 'rejected'."}, status=status.HTTP_400_BAD_REQUEST)

    # normalize
    if new_status == "accepted":
        new_status = accepted_val
    if new_status == "rejected":
        new_status = rejected_val

    try:
        booking = BookingRequest.objects.select_related("listing").get(
            id=booking_id,
            listing__owner=request.user
        )
    except BookingRequest.DoesNotExist:
        return Response({"detail": "Booking request not found."}, status=status.HTTP_404_NOT_FOUND)

    listing = booking.listing

    with transaction.atomic():
        booking.status = new_status
        booking.decided_at = timezone.now()
        booking.save(update_fields=["status", "decided_at"])

        # ✅ Update listing availability for public pages
        if new_status == accepted_val:
            listing.is_available = False
            listing.save(update_fields=["is_available"])

            # Optional: reject other requests for same listing
            BookingRequest.objects.filter(listing=listing).exclude(id=booking.id).exclude(
                status=rejected_val
            ).update(status=rejected_val, decided_at=timezone.now())

        elif new_status == rejected_val:
            still_accepted = BookingRequest.objects.filter(listing=listing, status=accepted_val).exists()
            if not still_accepted:
                listing.is_available = True
                listing.save(update_fields=["is_available"])

    return Response({
        "id": booking.id,
        "status": booking.status,
        "listing_id": listing.id,
        "listing_is_available": listing.is_available,
    })


# =====================================================
# ✅ FIX for your old frontend call:
# POST /api/messages/
# body: { "booking_id": 3, "text": "hello" }
# =====================================================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_message_legacy(request):
    booking_id = request.data.get("booking_id")
    text = str(
        request.data.get("text") or request.data.get("message") or request.data.get("body") or ""
    ).strip()

    if not booking_id or not text:
        return Response({"detail": "booking_id and text are required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        booking = BookingRequest.objects.select_related("listing", "tenant", "listing__owner").get(id=booking_id)
    except BookingRequest.DoesNotExist:
        return Response({"detail": "Booking request not found."}, status=status.HTTP_404_NOT_FOUND)

    # allow only tenant or listing owner
    if booking.tenant_id != request.user.id and booking.listing.owner_id != request.user.id:
        return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

    try:
        msg = BookingMessage.objects.create(request=booking, sender=request.user, text=text)
    except TypeError:
        try:
            msg = BookingMessage.objects.create(booking=booking, sender=request.user, text=text)
        except TypeError:
            msg = BookingMessage.objects.create(booking=booking, sender=request.user, message=text)

    return Response(BookingMessageSerializer(msg, context={"request": request}).data, status=status.HTTP_201_CREATED)
