# myapp/view/public/public_views.py
from math import radians, sin, cos, sqrt, asin
import re

from rest_framework import generics
from rest_framework.exceptions import ValidationError
from django.db.models import Q

from ...models import Listing
from ...serializers import ListingSerializer


def haversine_km(lat1, lng1, lat2, lng2):
    """
    Returns great-circle distance between two points in KM.
    """
    R = 6371.0  # Earth radius in KM

    lat1 = radians(lat1)
    lng1 = radians(lng1)
    lat2 = radians(lat2)
    lng2 = radians(lng2)

    dlat = lat2 - lat1
    dlng = lng2 - lng1

    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
    c = 2 * asin(sqrt(a))
    return R * c


def normalize_text(s: str) -> str:
    """
    Normalize user text so searches match even if user types:
    'itahari, dhulabari' vs 'itahari dhulabari.' etc.
    """
    s = (s or "").strip().lower()
    # turn punctuation into spaces
    s = re.sub(r"[.,;:_/\\\-]+", " ", s)
    # collapse multiple spaces
    s = re.sub(r"\s+", " ", s).strip()
    return s


def split_location_terms(location: str):
    """
    Break location into multiple terms:
    'itahari, dhulabari' -> ['itahari', 'dhulabari']
    Also handles extra spaces/punctuation.
    """
    if not location:
        return []
    # split by comma first
    parts = [p.strip() for p in location.split(",") if p.strip()]
    if not parts:
        parts = [location.strip()]
    # normalize each term
    out = []
    for p in parts:
        n = normalize_text(p)
        if n:
            out.append(n)
    return out


class PublicListingListView(generics.ListAPIView):
    serializer_class = ListingSerializer

    def get_queryset(self):
        qs = Listing.objects.filter(is_available=True).order_by("-created_at")

        raw_q = self.request.query_params.get("q", "")
        raw_location = self.request.query_params.get("location", "")

        # Support both param names: type OR property_type
        raw_ptype = self.request.query_params.get("type", "")
        if not raw_ptype:
            raw_ptype = self.request.query_params.get("property_type", "")

        q = normalize_text(raw_q)
        ptype = normalize_text(raw_ptype)
        loc_terms = split_location_terms(raw_location)

        # ✅ Search keyword: title OR description OR location
        if q:
            qs = qs.filter(
                Q(title__icontains=q) |
                Q(description__icontains=q) |
                Q(location__icontains=q)
            )

        # ✅ Location: require ALL terms to appear somewhere in location string
        # Example: "itahari, dhulabari" -> must contain "itahari" AND "dhulabari"
        for term in loc_terms:
            qs = qs.filter(location__icontains=term)

        # ✅ Type: ignore if empty or "all"
        # also accept "Apartment" from frontend (we normalize to lowercase)
        if ptype and ptype != "all":
            qs = qs.filter(property_type__iexact=ptype)

        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


class PublicListingDetailView(generics.RetrieveAPIView):
    queryset = Listing.objects.filter(is_available=True)
    serializer_class = ListingSerializer
    lookup_field = "pk"

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


# ======================================================
# Nearby Listings API (Map + Distance Filter)
# GET /api/public/listings/nearby/?lat=...&lng=...&radius_km=...
# ======================================================
class PublicListingNearbyView(generics.ListAPIView):
    serializer_class = ListingSerializer

    def get_queryset(self):
        lat = self.request.query_params.get("lat")
        lng = self.request.query_params.get("lng")
        radius_km = self.request.query_params.get("radius_km", "5")

        if lat is None or lng is None:
            raise ValidationError(
                "lat and lng are required. Example: ?lat=-33.86&lng=151.20&radius_km=5"
            )

        try:
            user_lat = float(lat)
            user_lng = float(lng)
            radius = float(radius_km)
        except ValueError:
            raise ValidationError("lat, lng, radius_km must be valid numbers.")

        if radius <= 0:
            raise ValidationError("radius_km must be greater than 0.")
        if radius > 200:
            radius = 200

        qs = Listing.objects.filter(
            is_available=True,
            latitude__isnull=False,
            longitude__isnull=False,
        ).order_by("-created_at")

        # Optional filters for nearby endpoint too
        raw_q = self.request.query_params.get("q", "")
        raw_location = self.request.query_params.get("location", "")
        raw_ptype = self.request.query_params.get("type", "")
        if not raw_ptype:
            raw_ptype = self.request.query_params.get("property_type", "")

        q = normalize_text(raw_q)
        ptype = normalize_text(raw_ptype)
        loc_terms = split_location_terms(raw_location)

        if q:
            qs = qs.filter(
                Q(title__icontains=q) |
                Q(description__icontains=q) |
                Q(location__icontains=q)
            )

        for term in loc_terms:
            qs = qs.filter(location__icontains=term)

        if ptype and ptype != "all":
            qs = qs.filter(property_type__iexact=ptype)

        results = []
        for listing in qs:
            try:
                d = haversine_km(
                    user_lat,
                    user_lng,
                    float(listing.latitude),
                    float(listing.longitude),
                )
            except Exception:
                continue

            if d <= radius:
                listing.distance_km = d
                results.append(listing)

        results.sort(key=lambda x: getattr(x, "distance_km", 999999))
        return results

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx
