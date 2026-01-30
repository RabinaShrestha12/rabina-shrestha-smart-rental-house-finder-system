from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ...models import Listing, BookingRequest


class IsTenantRole(IsAuthenticated):
    def has_permission(self, request, view):
        ok = super().has_permission(request, view)
        return bool(ok and getattr(request.user, "role", "") == "tenant")


class TenantRequestBookingView(APIView):
    permission_classes = [IsTenantRole]

    def post(self, request, listing_id):
        listing = Listing.objects.filter(id=listing_id, is_available=True).first()
        if not listing:
            return Response({"error": "Listing not available"}, status=status.HTTP_404_NOT_FOUND)

        if listing.owner_id == request.user.id:
            return Response({"error": "Owner cannot request booking on own listing"}, status=400)

        message = request.data.get("message", "")

        obj, _ = BookingRequest.objects.update_or_create(
            listing=listing,
            tenant=request.user,
            defaults={"message": message, "status": BookingRequest.STATUS_PENDING, "decided_at": None},
        )

        return Response({"message": "✅ Request sent to owner", "request_id": obj.id}, status=201)
