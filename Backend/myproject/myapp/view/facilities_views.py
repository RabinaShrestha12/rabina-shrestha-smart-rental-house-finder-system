from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..models import Listing, ListingFacility, Owner
from ..serializers import ListingFacilitySerializer
from .permissions import IsOwnerRole


@api_view(["GET"])
def listing_facilities(request, listing_id):
    qs = ListingFacility.objects.filter(listing_id=listing_id).order_by("kind", "distance_m")
    return Response(ListingFacilitySerializer(qs, many=True).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsOwnerRole])
def owner_add_facility(request, listing_id):
    owner = Owner.objects.get(user=request.user)
    try:
        listing = Listing.objects.get(id=listing_id, owner=owner)
    except Listing.DoesNotExist:
        return Response({"detail": "Listing not found."}, status=404)

    serializer = ListingFacilitySerializer(data=request.data)
    if serializer.is_valid():
        obj = serializer.save(listing=listing)
        return Response(ListingFacilitySerializer(obj).data, status=201)

    return Response(serializer.errors, status=400)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated, IsOwnerRole])
def owner_delete_facility(request, facility_id):
    owner = Owner.objects.get(user=request.user)
    try:
        f = ListingFacility.objects.get(id=facility_id, listing__owner=owner)
    except ListingFacility.DoesNotExist:
        return Response({"detail": "Not found."}, status=404)

    f.delete()
    return Response({"ok": True})
