from rest_framework import generics
from ...models import Listing
from ...serializers import ListingSerializer


class PublicListingListView(generics.ListAPIView):
    serializer_class = ListingSerializer

    def get_queryset(self):
        qs = Listing.objects.filter(is_available=True).order_by("-created_at")

        q = self.request.query_params.get("q", "").strip()
        location = self.request.query_params.get("location", "").strip()
        ptype = self.request.query_params.get("type", "").strip()  # room/house/apartment

        if q:
            qs = qs.filter(title__icontains=q) | qs.filter(description__icontains=q)

        if location:
            qs = qs.filter(location__icontains=location)

        if ptype:
            qs = qs.filter(property_type__iexact=ptype)

        return qs

    # ✅ VERY IMPORTANT (absolute urls for images)
    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


class PublicListingDetailView(generics.RetrieveAPIView):
    queryset = Listing.objects.filter(is_available=True)
    serializer_class = ListingSerializer
    lookup_field = "pk"

    # ✅ VERY IMPORTANT (absolute urls for images)
    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx
