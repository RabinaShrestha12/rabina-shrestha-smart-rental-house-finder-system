# myapp/view/maintenance_views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..models import Listing, MaintenanceRequest, ServiceProviderProfile, Notification
from .permissions import IsOwnerRole, IsProviderRole


def _create_notification(user, title, message, link=""):
    try:
        Notification.objects.create(user=user, title=title, message=message, link=link or "")
    except Exception:
        pass


def _user_display_name(user):
    if not user:
        return ""
    try:
        full_name = (user.get_full_name() or "").strip()
    except Exception:
        full_name = ""
    return full_name or getattr(user, "username", "") or getattr(user, "email", "") or "Unknown"


def _maintenance_to_dict(m: MaintenanceRequest):
    provider_user = m.assigned_provider
    provider_profile = None
    if provider_user:
        provider_profile = ServiceProviderProfile.objects.filter(user=provider_user).first()

    return {
        "id": m.id,
        "owner_id": m.owner_id,
        "owner_name": _user_display_name(m.owner),
        "owner_email": getattr(m.owner, "email", "") or "",

        "listing_id": m.listing_id,

        "assigned_provider_id": provider_user.id if provider_user else None,
        "assigned_provider_name": _user_display_name(provider_user) if provider_user else "",
        "assigned_provider_email": getattr(provider_user, "email", "") if provider_user else "",
        "assigned_provider_category": provider_profile.category if provider_profile else "",

        "category": m.category,
        "priority": m.priority,
        "status": m.status,
        "title": m.title,
        "description": m.description,
        "created_at": m.created_at,
        "updated_at": m.updated_at,
    }


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsOwnerRole])
def owner_create_maintenance_request(request):
    title = (request.data.get("title") or "").strip()
    description = (request.data.get("description") or "").strip()
    category = (request.data.get("category") or "other").strip()
    priority = (request.data.get("priority") or "medium").strip()

    if not title:
        return Response({"detail": "Title is required."}, status=status.HTTP_400_BAD_REQUEST)

    listing_id = request.data.get("listing") or request.data.get("listing_id") or ""
    listing = None
    if str(listing_id).strip():
        try:
            listing = Listing.objects.get(id=int(listing_id), owner=request.user)
        except (Listing.DoesNotExist, ValueError):
            return Response({"detail": "Listing not found or not yours."}, status=status.HTTP_404_NOT_FOUND)

    m = MaintenanceRequest.objects.create(
        owner=request.user,
        listing=listing,
        assigned_provider=None,
        category=category,
        priority=priority,
        status="open",
        title=title,
        description=description,
    )
    return Response(_maintenance_to_dict(m), status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsOwnerRole])
def owner_maintenance_requests(request):
    qs = MaintenanceRequest.objects.filter(owner=request.user).order_by("-created_at")
    return Response([_maintenance_to_dict(x) for x in qs], status=status.HTTP_200_OK)


@api_view(["PATCH", "POST"])
@permission_classes([IsAuthenticated, IsOwnerRole])
def owner_update_maintenance_status(request, req_id):
    new_status = (request.data.get("status") or "").strip()
    allowed = {"open", "in_progress", "resolved", "rejected"}
    if new_status not in allowed:
        return Response({"detail": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        m = MaintenanceRequest.objects.get(id=req_id, owner=request.user)
    except MaintenanceRequest.DoesNotExist:
        return Response({"detail": "Maintenance request not found."}, status=status.HTTP_404_NOT_FOUND)

    m.status = new_status
    m.save(update_fields=["status", "updated_at"])

    if m.assigned_provider:
        _create_notification(
            user=m.assigned_provider,
            title="Maintenance status updated",
            message=f"{_user_display_name(request.user)} updated '{m.title or f'Maintenance #{m.id}'}' to {m.status}",
            link=f"/provider/chat/{m.id}",
        )

    return Response(_maintenance_to_dict(m), status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsOwnerRole])
def owner_available_providers(request):
    category = (request.query_params.get("category") or "").strip().lower()
    area = (request.query_params.get("service_area") or "").strip().lower()

    qs = ServiceProviderProfile.objects.select_related("user").all()

    if category and category != "all":
        qs = qs.filter(category=category)

    if area:
        qs = qs.filter(service_area__icontains=area)

    data = []
    for p in qs.order_by("-updated_at"):
        data.append({
            "id": p.id,
            "user_id": p.user_id,
            "name": _user_display_name(p.user),
            "email": p.user.email,
            "phone": p.phone or getattr(p.user, "phone", ""),
            "category": p.category,
            "service_area": p.service_area,
            "availability": p.availability,
            "bio": p.bio,
        })
    return Response(data, status=status.HTTP_200_OK)


@api_view(["POST", "PATCH"])
@permission_classes([IsAuthenticated, IsOwnerRole])
def owner_assign_provider(request, req_id):
    provider_profile_id = (
        request.data.get("provider_profile_id")
        or request.data.get("provider_id")
        or request.data.get("assigned_provider_id")
    )

    if not provider_profile_id:
        return Response({"detail": "provider_profile_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        m = MaintenanceRequest.objects.get(id=req_id, owner=request.user)
    except MaintenanceRequest.DoesNotExist:
        return Response({"detail": "Maintenance request not found."}, status=status.HTTP_404_NOT_FOUND)

    try:
        profile = ServiceProviderProfile.objects.select_related("user").get(id=int(provider_profile_id))
    except (ServiceProviderProfile.DoesNotExist, ValueError):
        return Response({"detail": "Service provider not found."}, status=status.HTTP_404_NOT_FOUND)

    m.assigned_provider = profile.user
    m.save(update_fields=["assigned_provider", "updated_at"])

    _create_notification(
        user=profile.user,
        title="New maintenance request assigned",
        message=f"{_user_display_name(request.user)} assigned you '{m.title or f'Maintenance #{m.id}'}'",
        link=f"/provider/chat/{m.id}",
    )

    return Response(_maintenance_to_dict(m), status=status.HTTP_200_OK)


# -----------------------------
# PROVIDER SIDE
# -----------------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsProviderRole])
def provider_my_jobs(request):
    qs = MaintenanceRequest.objects.filter(assigned_provider=request.user).order_by("-updated_at", "-created_at")
    return Response([_maintenance_to_dict(x) for x in qs], status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsProviderRole])
def provider_accept_job(request, req_id):
    """
    Provider accepts a maintenance request.
    This opens chat: sets status=in_progress.
    """
    try:
        m = MaintenanceRequest.objects.get(id=req_id, assigned_provider=request.user)
    except MaintenanceRequest.DoesNotExist:
        return Response({"detail": "Job not found."}, status=status.HTTP_404_NOT_FOUND)

    m.status = "in_progress"
    m.save(update_fields=["status", "updated_at"])

    _create_notification(
        user=m.owner,
        title="Maintenance accepted",
        message=f"{_user_display_name(request.user)} accepted '{m.title or f'Maintenance #{m.id}'}'. Chat is now open.",
        link=f"/owner/maintenance/{m.id}",
    )

    return Response(_maintenance_to_dict(m), status=status.HTTP_200_OK)


@api_view(["PATCH", "POST"])
@permission_classes([IsAuthenticated, IsProviderRole])
def provider_update_job_status(request, req_id):
    new_status = (request.data.get("status") or "").strip()
    allowed = {"open", "in_progress", "resolved", "rejected", "completed"}
    if new_status not in allowed:
        return Response({"detail": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        m = MaintenanceRequest.objects.get(id=req_id, assigned_provider=request.user)
    except MaintenanceRequest.DoesNotExist:
        return Response({"detail": "Job not found."}, status=status.HTTP_404_NOT_FOUND)

    # If your model does not allow "completed", map it to "resolved"
    save_status = "resolved" if new_status == "completed" else new_status

    m.status = save_status
    m.save(update_fields=["status", "updated_at"])

    _create_notification(
        user=m.owner,
        title="Provider updated maintenance status",
        message=f"{_user_display_name(request.user)} updated '{m.title or f'Maintenance #{m.id}'}' to {save_status}",
        link=f"/owner/maintenance/{m.id}",
    )

    return Response(_maintenance_to_dict(m), status=status.HTTP_200_OK)