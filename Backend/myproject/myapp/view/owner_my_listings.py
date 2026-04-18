from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..models import Listing, PropertyGalleryImage
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


@api_view(["PATCH", "PUT"])
@permission_classes([IsAuthenticated])
def owner_my_listing_update(request, pk):
    obj = Listing.objects.filter(owner=request.user, pk=pk).first()
    if not obj:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    serializer = ListingSerializer(
        obj,
        data=request.data,
        partial=True,
        context={"request": request},
    )

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    listing = serializer.save()

    # add new extra gallery images
    gallery_files = request.FILES.getlist("gallery_images")
    for image_file in gallery_files:
        PropertyGalleryImage.objects.create(
            listing=listing,
            image=image_file,
        )

    # remove selected old gallery images if frontend sends ids
    remove_ids = []
    if hasattr(request.data, "getlist"):
        remove_ids = request.data.getlist("remove_gallery_image_ids")
    else:
        value = request.data.get("remove_gallery_image_ids", [])
        if isinstance(value, list):
            remove_ids = value
        elif value:
            remove_ids = [value]

    valid_ids = []
    for item in remove_ids:
        try:
            valid_ids.append(int(item))
        except (TypeError, ValueError):
            pass

    if valid_ids:
        PropertyGalleryImage.objects.filter(
            listing=listing,
            id__in=valid_ids,
        ).delete()

    data = ListingSerializer(listing, context={"request": request}).data
    return Response(data, status=status.HTTP_200_OK)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def owner_my_listing_delete(request, pk):
    obj = Listing.objects.filter(owner=request.user, pk=pk).first()
    if not obj:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    obj.delete()
    return Response({"detail": "Deleted successfully."}, status=status.HTTP_200_OK)