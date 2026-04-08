from django.contrib.auth import get_user_model
from django.db.models import Count
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..models import (
    Listing,
    BookingRequest,
    MaintenanceRequest,
    RoommateChatThread,
    BookingMessage,
    ProviderMessage,
    RoommateChatMessage,
)

User = get_user_model()


def is_admin_user(user):
    return bool(
        user
        and user.is_authenticated
        and (
            getattr(user, "role", "") == "admin"
            or getattr(user, "is_staff", False)
            or getattr(user, "is_superuser", False)
        )
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_dashboard_summary(request):
    if not is_admin_user(request.user):
        return Response(
            {"detail": "Admin access required."},
            status=status.HTTP_403_FORBIDDEN
        )

    owners = (
        User.objects.filter(role="owner")
        .annotate(property_count=Count("listings", distinct=True))
        .order_by("-id")
    )
    tenants = User.objects.filter(role="tenant").order_by("-id")
    providers = User.objects.filter(role="provider").order_by("-id")

    listings = Listing.objects.select_related("owner").order_by("-id")

    owners_data = [
        {
            "id": owner.id,
            "username": owner.username,
            "email": owner.email,
            "role": owner.role,
            "property_count": owner.property_count,
        }
        for owner in owners
    ]

    tenants_data = [
        {
            "id": tenant.id,
            "username": tenant.username,
            "email": tenant.email,
            "role": tenant.role,
        }
        for tenant in tenants
    ]

    providers_data = [
        {
            "id": provider.id,
            "username": provider.username,
            "email": provider.email,
            "role": provider.role,
        }
        for provider in providers
    ]

    properties_data = [
        {
            "id": listing.id,
            "title": listing.title,
            "location": listing.location,
            "price": str(listing.price_per_month),
            "owner_id": listing.owner.id if listing.owner else None,
            "owner_name": listing.owner.username if listing.owner else "N/A",
            "status": listing.status,
            "is_available": listing.is_available,
            "is_booked": listing.status == "booked",
        }
        for listing in listings
    ]

    total_properties = listings.count()
    booked_properties = listings.filter(status="booked").count()
    available_properties = listings.filter(status="available").count()

    return Response({
        "counts": {
            "owners": owners.count(),
            "tenants": tenants.count(),
            "providers": providers.count(),
            "properties": total_properties,
            "booked_properties": booked_properties,
            "available_properties": available_properties,
        },
        "owners": owners_data,
        "tenants": tenants_data,
        "providers": providers_data,
        "properties": properties_data,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_owner_property_details(request, owner_id):
    if not is_admin_user(request.user):
        return Response(
            {"detail": "Admin access required."},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        owner = User.objects.get(id=owner_id, role="owner")
    except User.DoesNotExist:
        return Response(
            {"detail": "Owner not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    owner_listings = Listing.objects.filter(owner=owner).order_by("-id")

    return Response({
        "owner": {
            "id": owner.id,
            "username": owner.username,
            "email": owner.email,
            "role": owner.role,
        },
        "property_count": owner_listings.count(),
        "properties": [
            {
                "id": listing.id,
                "title": listing.title,
                "location": listing.location,
                "price": str(listing.price_per_month),
                "status": listing.status,
                "is_available": listing.is_available,
                "is_booked": listing.status == "booked",
            }
            for listing in owner_listings
        ]
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_all_communications(request):
    """
    Exposes a summary of all chat threads on the platform to the Admin.
    Lists Tenant-Owner, Owner-Provider, and Roommate conversations.
    """
    if not is_admin_user(request.user):
        return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)

    comms = []

    # 1. Tenant-Owner Conversations (via BookingRequests)
    bookings = BookingRequest.objects.select_related("tenant", "listing__owner").all()
    for b in bookings:
        last_msg = BookingMessage.objects.filter(request=b).order_by("-created_at").first()
        if not last_msg:
            continue
        
        comms.append({
            "id": f"booking-{b.id}",
            "type": "tenant-owner",
            "sender_name": b.tenant.username,
            "sender_role": "tenant",
            "receiver_name": b.listing.owner.username,
            "receiver_role": "owner",
            "last_message": last_msg.text[:50] + "..." if len(last_msg.text) > 50 else last_msg.text,
            "created_at": last_msg.created_at,
            "channel": "In-App Chat"
        })

    # 2. Owner-Provider Conversations (via MaintenanceRequests)
    m_reqs = MaintenanceRequest.objects.select_related("owner", "assigned_provider").filter(assigned_provider__isnull=False)
    for m in m_reqs:
        last_msg = ProviderMessage.objects.filter(maintenance=m).order_by("-created_at").first()
        if not last_msg:
            continue

        comms.append({
            "id": f"maintenance-{m.id}",
            "type": "owner-provider",
            "sender_name": m.owner.username,
            "sender_role": "owner",
            "receiver_name": m.assigned_provider.username,
            "receiver_role": "provider",
            "last_message": last_msg.text[:50] + "..." if len(last_msg.text) > 50 else last_msg.text,
            "created_at": last_msg.created_at,
            "channel": "Service Portal"
        })

    # 3. Roommate Chat Threads
    roommate_threads = RoommateChatThread.objects.select_related("user1", "user2").all()
    for t in roommate_threads:
        last_msg = RoommateChatMessage.objects.filter(thread=t).order_by("-id").first()
        if not last_msg:
            continue
        
        comms.append({
            "id": f"roommate-{t.id}",
            "type": "roommate",
            "sender_name": t.user1.username,
            "sender_role": "tenant",
            "receiver_name": t.user2.username,
            "receiver_role": "tenant",
            "last_message": last_msg.text[:50] + "..." if len(last_msg.text) > 50 else last_msg.text,
            "created_at": last_msg.created_at if hasattr(last_msg, 'created_at') else t.created_at,
            "channel": "Roommate Finder"
        })

    # Sort all by latest first
    comms.sort(key=lambda x: x["created_at"], reverse=True)

    return Response(comms, status=status.HTTP_200_OK)