from rest_framework import generics
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.authentication import JWTAuthentication

from ...models import Listing
from ...serializers import ListingSerializer


class IsOwnerRole(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and getattr(request.user, "role", "") == "owner"
        )


class OwnerCreateListingView(generics.CreateAPIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsOwnerRole]
    serializer_class = ListingSerializer
    parser_classes = [MultiPartParser, FormParser]
    queryset = Listing.objects.all()

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user, is_available=True)


