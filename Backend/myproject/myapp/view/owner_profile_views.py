from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from myapp.models import Owner, Listing
from myapp.serializers import OwnerSerializer, ListingSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def owner_profile(request):
    user = request.user

    # ✅ only owners can access
    if getattr(user, "role", "") != "owner":
        return Response({"detail": "Only owner can access this profile."}, status=status.HTTP_403_FORBIDDEN)

    # ✅ ensure Owner table row exists
    owner_obj, _ = Owner.objects.get_or_create(
        user=user,
        defaults={
            "address": getattr(user, "address", "") or "",
            "phone": getattr(user, "phone", "") or "",
            "location": "",
        },
    )

    # ✅ optionally include listings
    listings = Listing.objects.filter(owner=user).order_by("-created_at")

    return Response(
        {
            "owner": OwnerSerializer(owner_obj).data,
            "listings": ListingSerializer(listings, many=True, context={"request": request}).data,
        },
        status=status.HTTP_200_OK,
    )
