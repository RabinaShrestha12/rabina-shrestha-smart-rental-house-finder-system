from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ...models import Listing


class IsTenantRole(IsAuthenticated):
    def has_permission(self, request, view):
        ok = super().has_permission(request, view)
        return bool(ok and getattr(request.user, "role", "") == "tenant")


class TenantBookListingView(APIView):
    permission_classes = [IsTenantRole]

    def post(self, request, listing_id):
        listing = Listing.objects.filter(id=listing_id, is_available=True).first()
        if not listing:
            return Response({"error": "Listing not available"}, status=status.HTTP_404_NOT_FOUND)

        # simple demo booking action
        listing.is_available = False
        listing.save()

        return Response({"message": "Booked successfully"}, status=status.HTTP_200_OK)
