from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..models import Listing
from ..serializers import ListingSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def owner_my_listings(request):
    qs = Listing.objects.filter(owner=request.user).order_by("-id")
    data = ListingSerializer(qs, many=True, context={"request": request}).data
    return Response(data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def owner_my_listing_detail(request, pk):
    obj = Listing.objects.filter(owner=request.user, pk=pk).first()
    if not obj:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    data = ListingSerializer(obj, context={"request": request}).data
    return Response(data, status=status.HTTP_200_OK)


# ✅ NEW: UPDATE (Edit button)
@api_view(["PATCH", "PUT"])
@permission_classes([IsAuthenticated])
def owner_my_listing_update(request, pk):
    obj = Listing.objects.filter(owner=request.user, pk=pk).first()
    if not obj:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    serializer = ListingSerializer(
        obj,
        data=request.data,
        partial=True,  # ✅ PATCH style update
        context={"request": request},
    )

    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ✅ NEW: DELETE (Delete button)
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def owner_my_listing_delete(request, pk):
    obj = Listing.objects.filter(owner=request.user, pk=pk).first()
    if not obj:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    obj.delete()
    return Response({"detail": "Deleted successfully."}, status=status.HTTP_200_OK)
