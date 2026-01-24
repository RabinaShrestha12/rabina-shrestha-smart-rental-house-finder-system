from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission
from rest_framework.response import Response
from rest_framework import status

from django.contrib.auth import get_user_model
from myapp.models import Listing
from myapp.serializers import ListingSerializer, OwnerProfileSerializer

User = get_user_model()


class IsOwnerRole(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", "") == "owner"
        )


# ✅ GET /api/owner-profile/
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def owner_profile(request):
    if getattr(request.user, "role", "") != "owner":
        return Response({"detail": "Only owners can access this."}, status=status.HTTP_403_FORBIDDEN)
    return Response(OwnerProfileSerializer(request.user).data, status=status.HTTP_200_OK)


# ✅ POST /api/owner/listings/create/
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsOwnerRole])
def owner_create_listing(request):
    serializer = ListingSerializer(data=request.data, context={"request": request})
    if serializer.is_valid():
        listing = serializer.save(owner=request.user)
        return Response(
            ListingSerializer(listing, context={"request": request}).data,
            status=status.HTTP_201_CREATED
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ✅ GET /api/listings/
@api_view(["GET"])
@permission_classes([AllowAny])
def public_listings(request):
    qs = Listing.objects.filter(is_available=True).order_by("-created_at")
    serializer = ListingSerializer(qs, many=True, context={"request": request})
    return Response(serializer.data, status=status.HTTP_200_OK)
