from django.utils import timezone
from django.db import transaction

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from myapp.models import (
    Listing,
    BookingRequest,
    BookingMessage,
    Notification,
    RentalContract,
)
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


def _get_booking_or_404(booking_id):
    try:
        return BookingRequest.objects.select_related(
            "listing", "tenant", "listing__owner"
        ).get(id=booking_id)
    except BookingRequest.DoesNotExist:
        return None


def _user_can_access_booking(user, booking):
    if not booking:
        return False
    return booking.tenant_id == user.id or booking.listing.owner_id == user.id


def _get_message_booking_id(msg):
    if hasattr(msg, "request_id") and msg.request_id:
        return msg.request_id
    if hasattr(msg, "booking_id") and msg.booking_id:
        return msg.booking_id
    if hasattr(msg, "request") and msg.request:
        return msg.request.id
    if hasattr(msg, "booking") and msg.booking:
        return msg.booking.id
    return None


def _get_message_booking(msg):
    if hasattr(msg, "request") and msg.request:
        return msg.request
    if hasattr(msg, "booking") and msg.booking:
        return msg.booking
    booking_id = _get_message_booking_id(msg)
    if booking_id:
        return _get_booking_or_404(booking_id)
    return None


def _get_text_from_message(msg):
    if hasattr(msg, "text"):
        return msg.text
    if hasattr(msg, "message"):
        return msg.message
    return ""


def _set_text_on_message(msg, value):
    if hasattr(msg, "text"):
        msg.text = value
        return "text"
    if hasattr(msg, "message"):
        msg.message = value
        return "message"
    return None


def _create_booking_thread_message(booking, sender, text, image=None):
    try:
        return BookingMessage.objects.create(
            request=booking,
            sender=sender,
            text=text,
            image=image,
        )
    except TypeError:
        try:
            return BookingMessage.objects.create(
                booking=booking,
                sender=sender,
                text=text,
                image=image,
            )
        except TypeError:
            return BookingMessage.objects.create(
                booking=booking,
                sender=sender,
                message=text,
                image=image,
            )


# =========================
# CONTRACT HELPERS
# =========================
def _get_user_display_name(user):
    try:
        full_name = user.get_full_name()
        if full_name:
            return full_name
    except Exception:
        pass

    for attr in ["full_name", "name", "username", "email"]:
        value = getattr(user, attr, "")
        if value:
            return str(value)

    return "User"


def _get_listing_title(listing):
    return (
        getattr(listing, "title", None)
        or getattr(listing, "property_name", None)
        or getattr(listing, "name", None)
        or f"Listing #{listing.id}"
    )


def _get_listing_address(listing):
    return (
        getattr(listing, "address", None)
        or getattr(listing, "location", None)
        or getattr(listing, "city", None)
        or "N/A"
    )


def _get_listing_rent_amount(listing):
    for attr in ["price_per_month", "price", "rent_price", "monthly_rent"]:
        value = getattr(listing, attr, None)
        if value is not None:
            return value
    return 0


def build_contract_text(contract):
    owner_name = _get_user_display_name(contract.owner)
    tenant_name = _get_user_display_name(contract.tenant)
    listing_title = _get_listing_title(contract.listing)
    listing_address = _get_listing_address(contract.listing)

    start_date = contract.start_date.isoformat() if contract.start_date else "Not set"
    end_date = contract.end_date.isoformat() if contract.end_date else "Not set"

    return f"""
RENTAL AGREEMENT

Contract Title:
{contract.contract_title or f"Rental Contract - {listing_title}"}

OWNER DETAILS
Name: {owner_name}

TENANT DETAILS
Name: {tenant_name}

PROPERTY DETAILS
Property: {listing_title}
Address: {listing_address}

RENTAL TERMS
Monthly Rent: {contract.rent_amount}
Security Deposit: {contract.security_deposit}
Payment Due Day: {contract.payment_due_day}
Start Date: {start_date}
End Date: {end_date}

UTILITY TERMS
{contract.utility_terms or "Utilities will be handled as agreed by both parties."}

HOUSE RULES
{contract.house_rules or "Tenant must maintain cleanliness, avoid damage, respect neighbours, and follow property rules."}

SPECIAL TERMS
{contract.special_terms or "No additional special terms."}

SIGNING STATUS
Owner Signed: {"Yes" if contract.owner_signed else "No"}
Tenant Signed: {"Yes" if contract.tenant_signed else "No"}

This agreement is digitally managed through the Smart Rental House Finder platform.
""".strip()


def _get_existing_contract_for_booking(booking):
    try:
        return booking.contract
    except Exception:
        return None


def create_contract_for_accepted_booking(booking, owner_user):
    """
    When owner accepts a booking:
    - create/reuse a contract
    - move it to pending_tenant so tenant can review and agree
    - generate contract preview text
    """
    listing = booking.listing
    tenant = booking.tenant
    rent_amount = _get_listing_rent_amount(listing)

    contract, created = RentalContract.objects.get_or_create(
        booking=booking,
        defaults={
            "listing": listing,
            "owner": owner_user,
            "tenant": tenant,
            "contract_title": f"Rental Contract - {_get_listing_title(listing)}",
            "rent_amount": rent_amount,
            "security_deposit": 0,
            "payment_due_day": 5,
            "utility_terms": "Electricity, water, internet and other utility terms will be as agreed.",
            "house_rules": "Tenant must maintain cleanliness, avoid damage, respect neighbours, and follow property rules.",
            "special_terms": "",
            "status": "pending_tenant",
        },
    )

    if not created:
        changed_fields = []

        if contract.owner_id != owner_user.id:
            contract.owner = owner_user
            changed_fields.append("owner")

        if contract.tenant_id != tenant.id:
            contract.tenant = tenant
            changed_fields.append("tenant")

        if contract.listing_id != listing.id:
            contract.listing = listing
            changed_fields.append("listing")

        if not contract.contract_title:
            contract.contract_title = f"Rental Contract - {_get_listing_title(listing)}"
            changed_fields.append("contract_title")

        if not contract.rent_amount:
            contract.rent_amount = rent_amount
            changed_fields.append("rent_amount")

        # Reopen editable states for tenant agreement
        reopen_states = ["rejected", "cancelled", "expired", "draft", "pending_tenant"]
        if str(contract.status).lower() in reopen_states:
            contract.status = "pending_tenant"
            changed_fields.append("status")

            if getattr(contract, "tenant_signed", False):
                contract.tenant_signed = False
                changed_fields.append("tenant_signed")

            if getattr(contract, "tenant_signed_at", None):
                contract.tenant_signed_at = None
                changed_fields.append("tenant_signed_at")

            if getattr(contract, "owner_signed", False):
                contract.owner_signed = False
                changed_fields.append("owner_signed")

            if getattr(contract, "owner_signed_at", None):
                contract.owner_signed_at = None
                changed_fields.append("owner_signed_at")

        if changed_fields:
            contract.save(update_fields=list(set(changed_fields + ["updated_at"])))

    contract.generated_text = build_contract_text(contract)
    contract.save(update_fields=["generated_text", "updated_at"])

    return contract


# =========================
# LISTING STATUS HELPER
# =========================
def _set_listing_available(listing):
    """
    Mark listing as available again.
    """
    changed_fields = []

    if hasattr(listing, "is_available") and listing.is_available is not True:
        listing.is_available = True
        changed_fields.append("is_available")

    if hasattr(Listing, "STATUS_AVAILABLE"):
        target_status = Listing.STATUS_AVAILABLE
    else:
        target_status = "available"

    if hasattr(listing, "status") and str(getattr(listing, "status", "")).lower() != str(target_status).lower():
        listing.status = target_status
        changed_fields.append("status")

    if changed_fields:
        listing.save(update_fields=changed_fields)


def _set_listing_booked(listing):
    """
    Mark listing as booked.
    """
    changed_fields = []

    if hasattr(listing, "is_available") and listing.is_available is not False:
        listing.is_available = False
        changed_fields.append("is_available")

    if hasattr(Listing, "STATUS_BOOKED"):
        target_status = Listing.STATUS_BOOKED
    else:
        target_status = "booked"

    if hasattr(listing, "status") and str(getattr(listing, "status", "")).lower() != str(target_status).lower():
        listing.status = target_status
        changed_fields.append("status")

    if changed_fields:
        listing.save(update_fields=changed_fields)


def _refresh_listing_state_from_bookings(listing):
    """
    Keep listing state correct based on current booking records.

    Rule:
    - if any accepted booking exists => booked
    - otherwise => available
    """
    accepted_val = getattr(BookingRequest, "STATUS_ACCEPTED", "accepted")

    accepted_exists = BookingRequest.objects.filter(
        listing=listing,
        status=accepted_val,
    ).exists()

    if accepted_exists:
        _set_listing_booked(listing)
    else:
        _set_listing_available(listing)


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

    if "listing_id" not in data and "listing" in data:
        data["listing_id"] = data.get("listing")

    if "first_message" not in data and "message" in data:
        data["first_message"] = data.get("message")

    ser = BookingRequestCreateSerializer(data=data, context={"request": request})
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    booking = ser.save()

    owner = getattr(booking.listing, "owner", None)
    if owner:
        tenant_label = request.user.email or request.user.username or "A tenant"
        listing_label = _get_listing_title(booking.listing)

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
    booking = _get_booking_or_404(booking_id)
    if not booking:
        return Response(
            {"detail": "Booking request not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not _user_can_access_booking(request.user, booking):
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
# also supports image upload in multipart/form-data
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

    image = request.FILES.get("image")

    if not text and not image:
        return Response(
            {"detail": "text or image is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    booking = _get_booking_or_404(booking_id)
    if not booking:
        return Response(
            {"detail": "Booking request not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not _user_can_access_booking(request.user, booking):
        return Response(
            {"detail": "Not allowed."},
            status=status.HTTP_403_FORBIDDEN,
        )

    msg = _create_booking_thread_message(booking, request.user, text, image=image)

    receiver = booking.listing.owner if request.user.id == booking.tenant_id else booking.tenant
    sender_label = request.user.email or request.user.username or "Someone"
    listing_label = _get_listing_title(booking.listing)

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
# BOTH: Update a single message
# PUT /api/booking-messages/<message_id>/update/
# PATCH /api/booking-messages/<message_id>/update/
# =========================
@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def booking_update_message(request, message_id):
    try:
        msg = BookingMessage.objects.select_related("sender").get(id=message_id)
    except BookingMessage.DoesNotExist:
        return Response(
            {"detail": "Message not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    booking = _get_message_booking(msg)
    if not booking:
        return Response(
            {"detail": "Related booking not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not _user_can_access_booking(request.user, booking):
        return Response(
            {"detail": "Not allowed."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if msg.sender_id != request.user.id:
        return Response(
            {"detail": "You can only update your own message."},
            status=status.HTTP_403_FORBIDDEN,
        )

    new_text = request.data.get("text", None)
    if new_text is None:
        new_text = request.data.get("message", None)
    if new_text is None:
        new_text = request.data.get("body", None)

    new_image = request.FILES.get("image")
    remove_image_raw = request.data.get("remove_image", False)

    if isinstance(remove_image_raw, str):
        remove_image = remove_image_raw.lower() in ["true", "1", "yes"]
    else:
        remove_image = bool(remove_image_raw)

    updated_fields = []

    if new_text is not None:
        new_text = str(new_text).strip()
        text_field = _set_text_on_message(msg, new_text)
        if text_field:
            updated_fields.append(text_field)

    if new_image is not None and hasattr(msg, "image"):
        if msg.image:
            try:
                msg.image.delete(save=False)
            except Exception:
                pass
        msg.image = new_image
        updated_fields.append("image")

    elif remove_image and hasattr(msg, "image"):
        if msg.image:
            try:
                msg.image.delete(save=False)
            except Exception:
                pass
        msg.image = None
        updated_fields.append("image")

    current_text = str(_get_text_from_message(msg) or "").strip()
    has_image = bool(getattr(msg, "image", None))

    if not current_text and not has_image:
        return Response(
            {"detail": "Message cannot be empty. Add text or image."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if hasattr(msg, "updated_at"):
        msg.updated_at = timezone.now()
        updated_fields.append("updated_at")

    if not updated_fields:
        return Response(
            {"detail": "No changes provided."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    msg.save(update_fields=list(set(updated_fields)))

    return Response(
        {
            "detail": "Message updated successfully.",
            "message": BookingMessageSerializer(msg, context={"request": request}).data,
        },
        status=status.HTTP_200_OK,
    )


# =========================
# BOTH: Delete a single message
# DELETE /api/booking-messages/<message_id>/delete/
# =========================
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def booking_delete_message(request, message_id):
    try:
        msg = BookingMessage.objects.select_related("sender").get(id=message_id)
    except BookingMessage.DoesNotExist:
        return Response(
            {"detail": "Message not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    booking = _get_message_booking(msg)
    if not booking:
        return Response(
            {"detail": "Related booking not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not _user_can_access_booking(request.user, booking):
        return Response(
            {"detail": "Not allowed."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if msg.sender_id != request.user.id:
        return Response(
            {"detail": "You can only delete your own message."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if hasattr(msg, "is_deleted"):
        msg.is_deleted = True
        fields = ["is_deleted"]

        if hasattr(msg, "deleted_at"):
            msg.deleted_at = timezone.now()
            fields.append("deleted_at")

        text_field = None
        if hasattr(msg, "text"):
            msg.text = "[deleted]"
            text_field = "text"
        elif hasattr(msg, "message"):
            msg.message = "[deleted]"
            text_field = "message"

        if text_field:
            fields.append(text_field)

        if hasattr(msg, "image") and msg.image:
            try:
                msg.image.delete(save=False)
            except Exception:
                pass
            msg.image = None
            fields.append("image")

        msg.save(update_fields=list(set(fields)))

        return Response(
            {"detail": "Message deleted successfully."},
            status=status.HTTP_200_OK,
        )

    if hasattr(msg, "image") and msg.image:
        try:
            msg.image.delete(save=False)
        except Exception:
            pass

    msg.delete()

    return Response(
        {"detail": "Message deleted successfully."},
        status=status.HTTP_200_OK,
    )


# =========================
# OWNER: Accept / Reject booking
# POST /api/owner/booking-requests/<booking_id>/status/
# body: { "status": "accepted" } or { "status": "rejected" } or { "status": "pending" }
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def owner_set_booking_status(request, booking_id):
    if not is_owner(request.user):
        return Response(
            {"detail": "Only OWNER can update status."},
            status=status.HTTP_403_FORBIDDEN,
        )

    raw_status = str(request.data.get("status", "")).strip().lower()

    accepted_val = getattr(BookingRequest, "STATUS_ACCEPTED", "accepted")
    rejected_val = getattr(BookingRequest, "STATUS_REJECTED", "rejected")
    pending_val = getattr(BookingRequest, "STATUS_PENDING", "pending")

    allowed_map = {
        "accepted": accepted_val,
        "rejected": rejected_val,
        "pending": pending_val,
        str(accepted_val).lower(): accepted_val,
        str(rejected_val).lower(): rejected_val,
        str(pending_val).lower(): pending_val,
    }

    if raw_status not in allowed_map:
        return Response(
            {"detail": "status must be 'accepted', 'rejected', or 'pending'."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    new_status = allowed_map[raw_status]

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
    contract = None
    contract_link = ""

    with transaction.atomic():
        booking.status = new_status

        update_fields = ["status"]
        if hasattr(booking, "decided_at"):
            booking.decided_at = timezone.now()
            update_fields.append("decided_at")

        booking.save(update_fields=update_fields)

        if booking.status == accepted_val:
            contract = create_contract_for_accepted_booking(booking, request.user)
            contract_link = f"/tenant/contracts/{contract.id}/"

        elif booking.status == rejected_val:
            existing_contract = _get_existing_contract_for_booking(booking)
            if existing_contract and existing_contract.status != "active":
                existing_contract.status = "rejected"
                existing_contract.generated_text = build_contract_text(existing_contract)
                existing_contract.save(update_fields=["status", "generated_text", "updated_at"])

        elif booking.status == pending_val:
            existing_contract = _get_existing_contract_for_booking(booking)
            if existing_contract and existing_contract.status != "active":
                existing_contract.status = "draft"
                existing_contract.generated_text = build_contract_text(existing_contract)
                existing_contract.save(update_fields=["status", "generated_text", "updated_at"])

        _refresh_listing_state_from_bookings(listing)

    tenant_user = booking.tenant
    listing_label = _get_listing_title(listing)

    if tenant_user:
        if booking.status == accepted_val:
            notify_text = (
                f"Your booking request for {listing_label} has been accepted. "
                f"Please read the rental agreement and accept it before payment."
            )

            _create_notification(
                user=tenant_user,
                title="Booking accepted - review contract",
                message=notify_text,
                link=contract_link,
            )

            _create_booking_thread_message(
                booking=booking,
                sender=request.user,
                text=f"{notify_text} Contract link: {contract_link}",
            )

        elif booking.status == rejected_val:
            _create_notification(
                user=tenant_user,
                title="Booking rejected",
                message=f"Your booking request for {listing_label} was rejected.",
                link=f"/tenant/inbox?open={booking.id}",
            )

            _create_booking_thread_message(
                booking=booking,
                sender=request.user,
                text="Your booking request was rejected by the owner.",
            )

        else:
            _create_notification(
                user=tenant_user,
                title="Booking request updated",
                message=(
                    f"Your booking request for {listing_label} is now {booking.status}."
                ),
                link=f"/tenant/inbox?open={booking.id}",
            )

    return Response(
        {
            "id": booking.id,
            "status": booking.status,
            "listing_id": listing.id,
            "listing_is_available": getattr(listing, "is_available", None),
            "listing_status": getattr(listing, "status", None),
            "payment_allowed": False if booking.status == accepted_val else booking.status == pending_val,
            "payment_link": "",
            "contract_created": booking.status == accepted_val,
            "contract_link": contract_link,
            "action_required": "read_contract" if booking.status == accepted_val else "",
            "detail": (
                "Booking accepted. Tenant must review the contract before payment."
                if booking.status == accepted_val
                else "Booking status updated successfully."
            ),
        },
        status=status.HTTP_200_OK,
    )


# =========================
# Legacy endpoint
# POST /api/booking-messages/create/
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

    image = request.FILES.get("image")

    if not booking_id:
        return Response(
            {"detail": "booking_id is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not text and not image:
        return Response(
            {"detail": "text or image is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    booking = _get_booking_or_404(booking_id)
    if not booking:
        return Response(
            {"detail": "Booking request not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not _user_can_access_booking(request.user, booking):
        return Response(
            {"detail": "Not allowed."},
            status=status.HTTP_403_FORBIDDEN,
        )

    msg = _create_booking_thread_message(booking, request.user, text, image=image)

    receiver = booking.listing.owner if request.user.id == booking.tenant_id else booking.tenant
    sender_label = request.user.email or request.user.username or "Someone"
    listing_label = _get_listing_title(booking.listing)

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