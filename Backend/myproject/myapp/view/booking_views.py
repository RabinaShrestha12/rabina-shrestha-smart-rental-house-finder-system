# myapp/view/booking_views.py
from django.utils import timezone
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
    # ✅ accept both "text" and "message" (frontend can send either)
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
        # Most common in your code: request FK + text field
        msg = BookingMessage.objects.create(request=booking, sender=request.user, text=text)
    except TypeError:
        try:
            # Alternate: booking FK + text field
            msg = BookingMessage.objects.create(booking=booking, sender=request.user, text=text)
        except TypeError:
            # Alternate: booking FK + message field
            msg = BookingMessage.objects.create(booking=booking, sender=request.user, message=text)

    return Response(BookingMessageSerializer(msg, context={"request": request}).data, status=status.HTTP_201_CREATED)


# =====================================================
# ✅ OWNER: Accept / Reject booking
# POST /api/owner/booking-requests/<booking_id>/status/
# body: { "status": "accepted" } or { "status": "rejected" }
# =====================================================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def owner_set_booking_status(request, booking_id):
    if not is_owner(request.user):
        return Response({"detail": "Only OWNER can update status."}, status=status.HTTP_403_FORBIDDEN)

    new_status = request.data.get("status")
    if new_status not in [BookingRequest.STATUS_ACCEPTED, BookingRequest.STATUS_REJECTED]:
        return Response({"detail": "status must be 'accepted' or 'rejected'."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        booking = BookingRequest.objects.select_related("listing").get(id=booking_id, listing__owner=request.user)
    except BookingRequest.DoesNotExist:
        return Response({"detail": "Booking request not found."}, status=status.HTTP_404_NOT_FOUND)

    booking.status = new_status
    booking.decided_at = timezone.now()
    booking.save(update_fields=["status", "decided_at"])

    # Optional: mark listing booked when accepted
    if new_status == BookingRequest.STATUS_ACCEPTED:
        # only if your Listing has mark_booked()
        if hasattr(booking.listing, "mark_booked"):
            booking.listing.mark_booked()

    return Response({"id": booking.id, "status": booking.status})


# =====================================================
# ✅ FIX for your error:
# Frontend was calling POST /api/messages/ (404)
# Now it will work.
#
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

    # Create message (same robust create)
    try:
        msg = BookingMessage.objects.create(request=booking, sender=request.user, text=text)
    except TypeError:
        try:
            msg = BookingMessage.objects.create(booking=booking, sender=request.user, text=text)
        except TypeError:
            msg = BookingMessage.objects.create(booking=booking, sender=request.user, message=text)

    return Response(BookingMessageSerializer(msg, context={"request": request}).data, status=status.HTTP_201_CREATED)
