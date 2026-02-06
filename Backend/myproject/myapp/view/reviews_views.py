# myapp/view/reviews_views.py

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..models import Listing, Review
from ..serializers import ReviewSerializer
from .permissions import IsTenantRole, IsOwnerRole


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsTenantRole])
def tenant_create_review(request):
    """
    ✅ UPDATED RULE:
    Tenant can create a review for a listing AFTER LOGIN (no booking/request required).

    Notes:
    - Review.tenant is USER in your project
    - Listing.owner is USER in your project
    """
    tenant_user = request.user  # ✅ USER

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

    owner_user = listing.owner  # ✅ USER

    # ✅ create or update (1 review per tenant per listing)
    obj, _created = Review.objects.get_or_create(
        listing=listing,
        tenant=tenant_user,
        owner=owner_user,
    )

    serializer = ReviewSerializer(obj, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save(listing=listing, tenant=tenant_user, owner=owner_user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def listing_reviews(request, listing_id):
    qs = Review.objects.filter(listing_id=listing_id).order_by("-created_at")
    return Response(ReviewSerializer(qs, many=True).data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsOwnerRole])
def owner_my_reviews(request):
    # ✅ Review.owner is USER
    owner_user = request.user
    qs = Review.objects.filter(owner=owner_user).order_by("-created_at")
    return Response(ReviewSerializer(qs, many=True).data, status=status.HTTP_200_OK)
