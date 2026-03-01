# myapp/view/roommate_views.py

from datetime import date
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..models import (
    RoommateProfile,
    RoommateRequest,
    RoommateChatThread,
    Notification,
    User,
)

from .permissions import IsTenantRole
from ..serializers import RoommateProfileSerializer, RoommateRequestSerializer


def _create_notification(user, title, message, link=""):
    try:
        Notification.objects.create(user=user, title=title, message=message, link=link or "")
    except Exception:
        pass


def _to_int(v, default=None):
    try:
        if v is None or v == "":
            return default
        return int(v)
    except Exception:
        return default


def _to_float(v, default=None):
    try:
        if v is None or v == "":
            return default
        return float(v)
    except Exception:
        return default


def _to_bool(v, default=False):
    if v is None or v == "":
        return default
    if isinstance(v, bool):
        return v
    s = str(v).strip().lower()
    if s in ["true", "1", "yes", "y", "on"]:
        return True
    if s in ["false", "0", "no", "n", "off"]:
        return False
    return default


def _parse_date(v):
    if not v:
        return None
    if isinstance(v, date):
        return v
    try:
        return date.fromisoformat(str(v))
    except Exception:
        return None


def _clean_str(v):
    return (v or "").strip()


def _ordered_pair(a_id: int, b_id: int):
    return (a_id, b_id) if a_id < b_id else (b_id, a_id)


# ----------------------------
# Matching Logic
# ----------------------------
def _budget_overlap_score(a_min, a_max, b_min, b_max):
    if a_min is None or a_max is None or b_min is None or b_max is None:
        return 0.5
    a_min, a_max = float(a_min), float(a_max)
    b_min, b_max = float(b_min), float(b_max)
    left = max(a_min, b_min)
    right = min(a_max, b_max)
    if right <= left:
        return 0.0
    overlap = right - left
    max_span = max(a_max - a_min, b_max - b_min, 1.0)
    return max(0.0, min(1.0, overlap / max_span))


def _move_in_score(a_date, b_date):
    if not a_date or not b_date:
        return 0.5
    diff_days = abs((a_date - b_date).days)
    if diff_days <= 14:
        return 1.0
    if diff_days <= 45:
        return 0.7
    return 0.3


def _gender_compat(my_gender_pref, other_gender):
    if not my_gender_pref or my_gender_pref == "any":
        return True
    return my_gender_pref == other_gender


def _pets_score(me: RoommateProfile, other: RoommateProfile):
    if me.pets_ok is False and other.pets_ok is True:
        return 0.5
    return 1.0


def _smoker_score(me: RoommateProfile, other: RoommateProfile):
    if me.smoker is False and other.smoker is True:
        return 0.3
    return 1.0


def _area_score(me: RoommateProfile, other: RoommateProfile):
    score = 0.5
    if me.city and other.city and me.city.strip().lower() == other.city.strip().lower():
        score = 1.0
    if me.preferred_area and other.preferred_area:
        if me.preferred_area.strip().lower() == other.preferred_area.strip().lower():
            score = 1.0
    return score


def _preference_match_score(me: RoommateProfile, other: RoommateProfile):
    if not _gender_compat(me.preferred_gender, other.gender):
        return 0.0
    if not _gender_compat(other.preferred_gender, me.gender):
        return 0.0

    bscore = _budget_overlap_score(me.min_budget, me.max_budget, other.min_budget, other.max_budget)
    tidy_diff = abs(int(me.tidy_level or 3) - int(other.tidy_level or 3))
    quiet_diff = abs(int(me.quiet_level or 3) - int(other.quiet_level or 3))
    lifestyle_score = 1.0 - min(1.0, (tidy_diff + quiet_diff) / 8.0)

    mscore = _move_in_score(me.move_in_date, other.move_in_date)
    ascore = _area_score(me, other)
    sscore = _smoker_score(me, other)
    pscore = _pets_score(me, other)

    score = (
        0.35 * bscore +
        0.20 * lifestyle_score +
        0.15 * mscore +
        0.15 * ascore +
        0.10 * sscore +
        0.05 * pscore
    )
    return max(0.0, min(1.0, round(score, 3)))


def _match_reasons(me: RoommateProfile, other: RoommateProfile, score: float):
    reasons = []
    if me.city and other.city and me.city.strip().lower() == other.city.strip().lower():
        reasons.append(f"Same city: {me.city}")
    if me.preferred_area and other.preferred_area and me.preferred_area.strip().lower() == other.preferred_area.strip().lower():
        reasons.append(f"Same preferred area: {me.preferred_area}")
    if me.min_budget and me.max_budget and other.min_budget and other.max_budget:
        reasons.append("Budget ranges overlap")
    if me.move_in_date and other.move_in_date:
        diff = abs((me.move_in_date - other.move_in_date).days)
        reasons.append(f"Move-in dates are close ({diff} days)")
    reasons.append(f"Match score: {score}")
    return reasons[:4]


# ----------------------------
# API Endpoints
# ----------------------------
@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated, IsTenantRole])
def roommate_my_profile(request):
    user = request.user
    prof, _ = RoommateProfile.objects.get_or_create(user=user)

    if request.method == "GET":
        return Response(RoommateProfileSerializer(prof).data, status=status.HTTP_200_OK)

    data = request.data.copy()
    data["gender"] = _clean_str(data.get("gender")).lower() or "any"
    data["preferred_gender"] = _clean_str(data.get("preferred_gender")).lower() or "any"
    data["min_budget"] = _to_float(data.get("min_budget"), default=None)
    data["max_budget"] = _to_float(data.get("max_budget"), default=None)
    data["stay_length_months"] = _to_int(data.get("stay_length_months"), default=None)
    data["tidy_level"] = _to_int(data.get("tidy_level"), default=3)
    data["quiet_level"] = _to_int(data.get("quiet_level"), default=3)
    data["smoker"] = _to_bool(data.get("smoker"), default=False)
    data["pets_ok"] = _to_bool(data.get("pets_ok"), default=True)
    data["is_active"] = _to_bool(data.get("is_active"), default=True)
    data["move_in_date"] = _parse_date(data.get("move_in_date"))
    data["city"] = _clean_str(data.get("city"))
    data["preferred_area"] = _clean_str(data.get("preferred_area"))
    data["bio"] = _clean_str(data.get("bio"))

    ser = RoommateProfileSerializer(prof, data=data, partial=True)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    ser.save()
    return Response(ser.data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsTenantRole])
def roommate_matches(request):
    user = request.user
    me, _ = RoommateProfile.objects.get_or_create(user=user)

    if not me.is_active:
        return Response({"detail": "Activate your roommate profile first."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        min_score = float(request.query_params.get("min_score", 0.4))
    except Exception:
        min_score = 0.4

    try:
        limit = int(request.query_params.get("limit", 20))
    except Exception:
        limit = 20

    others = RoommateProfile.objects.filter(is_active=True).exclude(user=user)
    if me.city:
        others = others.filter(city__iexact=me.city)

    ranked = []
    for other in others:
        score = _preference_match_score(me, other)
        if score >= min_score:
            ranked.append((score, other))

    ranked.sort(key=lambda x: -x[0])
    ranked = ranked[:limit]

    results = []
    for score, other in ranked:
        data = RoommateProfileSerializer(other).data
        data["match_score"] = score
        data["match_reasons"] = _match_reasons(me, other, score)
        results.append(data)

    return Response({"count": len(results), "results": results}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsTenantRole])
def roommate_send_request(request):
    from_user = request.user

    to_user_id = request.data.get("to_user") or request.data.get("to_user_id")
    message = _clean_str(request.data.get("message"))

    to_user_id = _to_int(to_user_id, default=None)
    if not to_user_id:
        return Response({"detail": "to_user is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        to_user = User.objects.get(id=to_user_id)
    except Exception:
        return Response({"detail": "Target user not found"}, status=status.HTTP_404_NOT_FOUND)

    if to_user.id == from_user.id:
        return Response({"detail": "You cannot request yourself"}, status=status.HTTP_400_BAD_REQUEST)

    if getattr(to_user, "role", "") != "tenant":
        return Response({"detail": "Target user is not a tenant"}, status=status.HTTP_400_BAD_REQUEST)

    obj, created = RoommateRequest.objects.get_or_create(from_user=from_user, to_user=to_user)

    if not created and obj.status == "pending":
        return Response(
            {"detail": "Request already pending", "request": RoommateRequestSerializer(obj).data},
            status=status.HTTP_200_OK
        )

    obj.message = message
    obj.status = "pending"
    obj.responded_at = None
    obj.save()

    _create_notification(
        to_user,
        "New Roommate Request",
        f"{from_user.username} sent you a roommate request.",
        link="/tenant/roommates/requests",
    )

    return Response(RoommateRequestSerializer(obj).data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsTenantRole])
def roommate_my_requests(request):
    user = request.user
    received = RoommateRequest.objects.filter(to_user=user).order_by("-created_at")
    sent = RoommateRequest.objects.filter(from_user=user).order_by("-created_at")

    return Response({
        "received": RoommateRequestSerializer(received, many=True).data,
        "sent": RoommateRequestSerializer(sent, many=True).data,
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsTenantRole])
def roommate_respond_request(request, request_id: int):
    user = request.user
    action = _clean_str(request.data.get("action")).lower()

    try:
        req = RoommateRequest.objects.select_related("from_user", "to_user").get(id=request_id, to_user=user)
    except Exception:
        return Response({"detail": "Request not found"}, status=status.HTTP_404_NOT_FOUND)

    if req.status != "pending":
        return Response({"detail": f"Request already {req.status}"}, status=status.HTTP_400_BAD_REQUEST)

    if action not in ["accept", "reject"]:
        return Response({"detail": "action must be accept or reject"}, status=status.HTTP_400_BAD_REQUEST)

    req.status = "accepted" if action == "accept" else "rejected"
    req.responded_at = timezone.now()
    req.save()

    thread_id = None
    if req.status == "accepted":
        a, b = _ordered_pair(req.from_user_id, req.to_user_id)
        thread, _ = RoommateChatThread.objects.get_or_create(
            user1_id=a,
            user2_id=b,
            defaults={"title": f"{req.from_user.username} & {req.to_user.username}"},
        )
        thread_id = thread.id

    _create_notification(
        req.from_user,
        "Roommate Request Update",
        f"{user.username} has {req.status} your roommate request.",
        link="/tenant/roommates/requests",
    )

    data = RoommateRequestSerializer(req).data
    data["thread_id"] = thread_id
    return Response(data, status=status.HTTP_200_OK)