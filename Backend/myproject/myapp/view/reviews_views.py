# myapp/view/reviews_views.py

from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..models import Listing, Review, Notification
from ..serializers import ReviewSerializer
from .permissions import IsTenantRole, IsOwnerRole


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


def _user_display_name(user):
    if not user:
        return "Someone"
    try:
        full_name = (user.get_full_name() or "").strip()
    except Exception:
        full_name = ""
    return full_name or getattr(user, "username", "") or getattr(user, "email", "") or "Someone"


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsTenantRole])
def tenant_create_review(request):
    tenant_user = request.user

    listing_id = request.data.get("listing") or request.data.get("listing_id")
    if not listing_id:
        return Response({"detail": "listing is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        listing_id = int(listing_id)
    except Exception:
        return Response({"detail": "listing must be an integer."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        listing = Listing.objects.get(id=listing_id)
    except Listing.DoesNotExist:
        return Response({"detail": "Listing not found."}, status=status.HTTP_404_NOT_FOUND)

    owner_user = listing.owner

    obj, created = Review.objects.get_or_create(
        listing=listing,
        tenant=tenant_user,
        defaults={"owner": owner_user},
    )

    serializer = ReviewSerializer(obj, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    review = serializer.save(
        listing=listing,
        tenant=tenant_user,
        owner=owner_user,
    )

    tenant_name = _user_display_name(tenant_user)
    listing_title = getattr(listing, "title", "") or f"Listing #{listing.id}"

    if created:
        notif_title = "New review received"
        notif_message = f"{tenant_name} sent a review for {listing_title}."
    else:
        notif_title = "Review updated"
        notif_message = f"{tenant_name} updated a review for {listing_title}."

    _create_notification(
        user=owner_user,
        title=notif_title,
        message=notif_message,
        link="/owner",
    )

    return Response(ReviewSerializer(review).data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def listing_reviews(request, listing_id):
    qs = (
        Review.objects
        .filter(listing_id=listing_id)
        .select_related("listing", "tenant", "owner")
        .order_by("-created_at")
    )
    return Response(ReviewSerializer(qs, many=True).data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsOwnerRole])
def owner_my_reviews(request):
    owner_user = request.user

    qs = (
        Review.objects
        .filter(
            Q(owner=owner_user) | Q(listing__owner=owner_user)
        )
        .select_related("listing", "tenant", "owner")
        .distinct()
        .order_by("-created_at")
    )

    return Response(ReviewSerializer(qs, many=True).data, status=status.HTTP_200_OK)