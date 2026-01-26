# myapp/view/public/public_views.py

import re
from django.db.models import Q
from rest_framework import generics, permissions

from ...models import Listing
from ...serializers import ListingSerializer


# ✅ Handle common spelling variations
LOCATION_ALIASES = {
    "itahari": ["itahari", "itharai"],
    "itharai": ["itahari", "itharai"],
}


def build_location_filter(location: str) -> Q:
    """
    Returns a Q() filter that matches known location variations.
    """
    loc = (location or "").strip().lower()
    variants = LOCATION_ALIASES.get(loc, [loc])

    q_obj = Q()
    for v in variants:
        if v:
            q_obj |= Q(location__icontains=v)
    return q_obj


class PublicListingListView(generics.ListAPIView):
    """
    ✅ PUBLIC HOMEPAGE LISTINGS
    Anyone can view listings without login.
    Supports search + location + type filters.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = ListingSerializer

    def get_queryset(self):
        qs = Listing.objects.filter(is_available=True).order_by("-created_at")

        q = (self.request.query_params.get("q") or "").strip()
        location = (self.request.query_params.get("location") or "").strip()
        listing_type = (self.request.query_params.get("type") or "").strip().lower()

        # ✅ Make q forgiving: remove punctuation like "...", ",", etc.
        # "this is ..." becomes "this is"
        q = re.sub(r"[^\w\s]", " ", q)
        q = re.sub(r"\s+", " ", q).strip()

        q_lower = q.lower()

        # ✅ If q is a type word, don't double-filter
        # Example: q="room" and type="room" should still show results.
        if q_lower in {"room", "house", "apartment"}:
            if (not listing_type) or (listing_type == q_lower):
                listing_type = q_lower
                q = ""

        # ✅ Keyword search (includes property_type too)
        if q:
            qs = qs.filter(
                Q(title__icontains=q)
                | Q(description__icontains=q)
                | Q(location__icontains=q)
                | Q(property_type__icontains=q)
            )

        # ✅ Location filter (handles itahari/itharai)
        if location:
            qs = qs.filter(build_location_filter(location))

        # ✅ Type filter
        if listing_type and listing_type != "all":
            qs = qs.filter(property_type__iexact=listing_type)

        return qs

    def get_serializer_context(self):
        """
        ✅ Needed for image_url/pano_url build_absolute_uri in serializer
        """
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


class PublicListingDetailView(generics.RetrieveAPIView):
    """
    ✅ PUBLIC LISTING DETAIL
    Anyone can view listing details without login.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = ListingSerializer
    queryset = Listing.objects.filter(is_available=True)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx
