# myapp/view/public/public_views.py
from rest_framework import generics, permissions
from ...models import Listing
from ...serializers import ListingSerializer


class PublicListingListView(generics.ListAPIView):
    """
    ✅ PUBLIC HOMEPAGE DASHBOARD
    Anyone can view listings without login.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = ListingSerializer

    def get_queryset(self):
        qs = Listing.objects.filter(is_available=True).order_by("-created_at")

        # ✅ optional search/filter for homepage
        q = self.request.query_params.get("q")
        location = self.request.query_params.get("location")
        ptype = self.request.query_params.get("type")

        if q:
            qs = qs.filter(title__icontains=q)
        if location:
            qs = qs.filter(location__icontains=location)
        if ptype:
            qs = qs.filter(property_type=ptype)

        return qs

    def get_serializer_context(self):
        """
        ✅ Needed for image_url (build_absolute_uri)
        """
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


class PublicListingDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = ListingSerializer

    def get_queryset(self):
        return Listing.objects.filter(is_available=True)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx
