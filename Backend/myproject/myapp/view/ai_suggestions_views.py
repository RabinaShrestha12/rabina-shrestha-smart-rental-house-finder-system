# myapp/view/ai_suggestions_views.py
import math
import requests

from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..models import Listing, Notification
from .permissions import IsTenantRole


def _create_notification(user, title, message, link=""):
    try:
        Notification.objects.create(user=user, title=title, message=message, link=link or "")
    except Exception:
        pass


def _to_float(v):
    try:
        if v is None or v == "":
            return None
        return float(v)
    except Exception:
        return None


def _haversine_km(lat1, lon1, lat2, lon2):
    # Earth radius km
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dl / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def _geocode_place_nominatim(place_name: str):
    """
    Free geocoding using OpenStreetMap Nominatim.
    NOTE: For production, add caching and respect rate limits.
    """
    if not place_name:
        return None

    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": place_name, "format": "json", "limit": 1}
    headers = {"User-Agent": "SmartRentalHouseFinder/1.0 (contact: your-email@example.com)"}

    try:
        r = requests.get(url, params=params, headers=headers, timeout=8)
        r.raise_for_status()
        data = r.json()
        if not data:
            return None
        return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception:
        return None


def _listing_to_dict(l: Listing, distance_km=None):
    return {
        "id": l.id,
        "title": l.title,
        "location": l.location,
        "price_per_month": str(l.price_per_month),
        "property_type": l.property_type,
        "latitude": float(l.latitude) if l.latitude is not None else None,
        "longitude": float(l.longitude) if l.longitude is not None else None,
        "image": l.image.url if getattr(l, "image", None) else None,
        "distance_km": round(distance_km, 2) if distance_km is not None else None,
    }


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsTenantRole])
def tenant_ai_suggest_nearby(request):
    """
    ✅ Requirement 1:
    Tenant enters a place name (or lat/lng), choose radius (1km/2km/15km),
    system suggests nearby listings and creates a Notification.
    ✅ Requirement 2:
    filter by min_price/max_price/property_type.
    """

    place = (request.data.get("place") or "").strip()
    lat = _to_float(request.data.get("lat"))
    lng = _to_float(request.data.get("lng"))

    radius_km = _to_float(request.data.get("radius_km")) or 2.0
    min_price = _to_float(request.data.get("min_price"))
    max_price = _to_float(request.data.get("max_price"))
    property_type = (request.data.get("property_type") or "").strip().lower()  # room/house/apartment

    # 1) Determine target coordinate
    if lat is None or lng is None:
        if not place:
            return Response(
                {"detail": "Provide place OR lat/lng."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        geo = _geocode_place_nominatim(place)
        if not geo:
            return Response(
                {"detail": "Could not geocode this place name. Try a different name or send lat/lng from map."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        lat, lng = geo

    # 2) Base queryset
    qs = Listing.objects.filter(is_available=True)

    # property type filter
    if property_type and property_type != "all":
        qs = qs.filter(property_type=property_type)

    # price filters
    if min_price is not None:
        qs = qs.filter(price_per_month__gte=min_price)
    if max_price is not None:
        qs = qs.filter(price_per_month__lte=max_price)

    # 3) Compute distances and keep only within radius
    results = []
    for l in qs:
        if l.latitude is None or l.longitude is None:
            continue
        d = _haversine_km(lat, lng, float(l.latitude), float(l.longitude))
        if d <= radius_km:
            results.append((d, l))

    results.sort(key=lambda x: x[0])  # nearest first
    top = results[:30]  # limit

    payload = [_listing_to_dict(l, distance_km=d) for d, l in top]

    # 4) Create notification (summary)
    title_txt = "AI Nearby Suggestions"
    place_txt = place if place else f"{lat:.4f},{lng:.4f}"
    msg_txt = f"Found {len(payload)} listings within {radius_km} km of {place_txt}."

    # Link can point to a frontend page you create later (recommended)
    link = f"/tenant/ai?place={place_txt}&radius_km={radius_km}"

    _create_notification(request.user, title_txt, msg_txt, link=link)

    return Response(
        {
            "center": {"lat": lat, "lng": lng, "place": place},
            "radius_km": radius_km,
            "count": len(payload),
            "results": payload,
        },
        status=status.HTTP_200_OK,
    )