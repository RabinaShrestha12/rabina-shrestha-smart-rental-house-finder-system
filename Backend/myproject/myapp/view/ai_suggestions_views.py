import math
import requests

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


def _clamp(x, lo=0.0, hi=1.0):
    try:
        return max(lo, min(hi, float(x)))
    except Exception:
        return lo


def _haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dl / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


# ✅ REPLACE THIS FUNCTION
def _geocode_place_nominatim(place_name: str):
    """
    Free geocoding using OpenStreetMap Nominatim.
    NOTE: For production, add caching and respect rate limits.
    """
    if not place_name:
        return None

    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": place_name,
        "format": "jsonv2",  # ✅ better format
        "limit": 1,
        "addressdetails": 0,
        # ✅ use a real contact email (important for reliability)
        "email": "kechan.shrestha@gmail.com",
    }
    headers = {
        # ✅ use real contact
        "User-Agent": "SmartRentalHouseFinder/1.0 (contact: kechan.shrestha@gmail.com)",
        "Accept": "application/json",
        "Accept-Language": "en",
    }

    try:
        r = requests.get(url, params=params, headers=headers, timeout=12)

        # If blocked/limited
        if r.status_code in (403, 429):
            return None

        # Must be 200
        if r.status_code != 200:
            return None

        data = r.json()

        # Nominatim returns a list
        if not isinstance(data, list) or len(data) == 0:
            return None

        lat = float(data[0].get("lat"))
        lon = float(data[0].get("lon"))
        return lat, lon

    except Exception as e:
        # ✅ helpful debug in terminal
        print("GEOCODE ERROR:", type(e).__name__, str(e))
        return None


def _score_listing(distance_km, price, min_price=None, max_price=None, radius_km=2.0):
    reasons = []

    if radius_km and radius_km > 0:
        distance_score = 1.0 - _clamp(distance_km / radius_km)
    else:
        distance_score = 0.0

    reasons.append(f"{distance_km:.2f} km from your location")

    budget_score = 0.5
    try:
        p = float(price)
    except Exception:
        p = None

    if p is not None:
        if min_price is not None and max_price is not None and max_price >= min_price:
            center = (min_price + max_price) / 2.0
            half_range = max((max_price - min_price) / 2.0, 1.0)
            diff = abs(p - center)
            budget_score = 1.0 - _clamp(diff / half_range)
            reasons.append(f"Within your budget ({min_price:.0f}–{max_price:.0f})")
        elif min_price is not None:
            budget_score = 0.8
            reasons.append(f"Meets minimum budget (≥ {min_price:.0f})")
        elif max_price is not None:
            budget_score = 0.8
            reasons.append(f"Within max budget (≤ {max_price:.0f})")

    score = (0.6 * distance_score) + (0.4 * budget_score)
    score = round(_clamp(score), 3)

    return score, reasons


def _listing_to_dict(l: Listing, distance_km=None, score=None, reasons=None):
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
        "recommendation_score": score,
        "recommend_reasons": reasons or [],
    }


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsTenantRole])
def tenant_ai_suggest_nearby(request):
    place = (request.data.get("place") or "").strip()
    lat = _to_float(request.data.get("lat"))
    lng = _to_float(request.data.get("lng"))

    radius_km = _to_float(request.data.get("radius_km")) or 2.0
    min_price = _to_float(request.data.get("min_price"))
    max_price = _to_float(request.data.get("max_price"))
    property_type = (request.data.get("property_type") or "").strip().lower()

    # 1) Determine target coordinate
    if lat is None or lng is None:
        if not place:
            return Response({"detail": "Provide place OR lat/lng."}, status=status.HTTP_400_BAD_REQUEST)

        geo = _geocode_place_nominatim(place)
        if not geo:
            return Response(
                {"detail": "Could not geocode this place name. Try a different name or send lat/lng from map."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        lat, lng = geo

    # 2) Base queryset
    qs = Listing.objects.filter(is_available=True)

    if property_type and property_type != "all":
        qs = qs.filter(property_type=property_type)

    if min_price is not None:
        qs = qs.filter(price_per_month__gte=min_price)
    if max_price is not None:
        qs = qs.filter(price_per_month__lte=max_price)

    # 3) Build ranked results with fallback radius
    radius_used = radius_km
    fallback_used = False

    def build_ranked_results(current_radius):
        ranked = []
        for l in qs:
            if l.latitude is None or l.longitude is None:
                continue

            d = _haversine_km(lat, lng, float(l.latitude), float(l.longitude))
            if d <= current_radius:
                score, reasons = _score_listing(
                    distance_km=d,
                    price=float(l.price_per_month),
                    min_price=min_price,
                    max_price=max_price,
                    radius_km=current_radius,
                )
                ranked.append((score, d, reasons, l))

        ranked.sort(key=lambda x: (-x[0], x[1]))
        return ranked

    ranked = build_ranked_results(radius_used)

    if len(ranked) == 0:
        for r in [max(radius_used, 3.0), 5.0, 10.0]:
            ranked = build_ranked_results(r)
            if ranked:
                radius_used = r
                fallback_used = True
                break

    top = ranked[:30]
    payload = [
        _listing_to_dict(l, distance_km=d, score=score, reasons=reasons)
        for (score, d, reasons, l) in top
    ]

    # 4) Notification
    title_txt = "AI Nearby Suggestions"
    place_txt = place if place else f"{lat:.4f},{lng:.4f}"

    if fallback_used:
        msg_txt = (
            f"No listings found in {radius_km} km. "
            f"Showing {len(payload)} listings within {radius_used} km of {place_txt}."
        )
    else:
        msg_txt = f"Found {len(payload)} listings within {radius_used} km of {place_txt}."

    link = f"/tenant/ai?place={place_txt}&radius_km={radius_used}"
    _create_notification(request.user, title_txt, msg_txt, link=link)

    return Response(
        {
            "center": {"lat": lat, "lng": lng, "place": place},
            "radius_km_requested": radius_km,
            "radius_km_used": radius_used,
            "fallback_used": fallback_used,
            "count": len(payload),
            "results": payload,
        },
        status=status.HTTP_200_OK,
    )