from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser

from ...models import Listing
from ...serializers import ListingSerializer


class IsOwnerRole(IsAuthenticated):
    """
    Only logged-in user with role='owner'
    """
    def has_permission(self, request, view):
        ok = super().has_permission(request, view)
        return bool(ok and getattr(request.user, "role", "") == "owner")


class OwnerCreateListingView(generics.CreateAPIView):
    """
    OWNER: create listing (with image upload)
    """
    permission_classes = [IsOwnerRole]
    serializer_class = ListingSerializer
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
