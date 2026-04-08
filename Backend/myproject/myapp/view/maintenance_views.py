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


def _get_owner_listing(request, listing_id):
    """
    listing_id can be:
    - None / "" => no listing
    - valid id owned by current owner => return Listing
    - invalid / not owned => return Response error
    """
    if listing_id in [None, "", "null"]:
        return None

    try:
        listing = Listing.objects.get(id=int(listing_id), owner=request.user)
        return listing
    except (Listing.DoesNotExist, ValueError, TypeError):
        return Response(
            {"detail": "Listing not found or not yours."},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsOwnerRole])
def owner_create_maintenance_request(request):
    title = (request.data.get("title") or "").strip()
    description = (request.data.get("description") or "").strip()
    category = (request.data.get("category") or "other").strip()
    priority = (request.data.get("priority") or "medium").strip()

    allowed_categories = {
        "plumbing", "electrical", "cleaning", "internet", "gas",
        "hvac", "pest_control", "carpentry", "painting", "other"
    }
    allowed_priorities = {"low", "medium", "high", "emergency"}

    if not title:
        return Response({"detail": "Title is required."}, status=status.HTTP_400_BAD_REQUEST)

    if not description:
        return Response({"detail": "Description is required."}, status=status.HTTP_400_BAD_REQUEST)

    if category not in allowed_categories:
        return Response({"detail": "Invalid category."}, status=status.HTTP_400_BAD_REQUEST)

    if priority not in allowed_priorities:
        return Response({"detail": "Invalid priority."}, status=status.HTTP_400_BAD_REQUEST)

    listing_id = request.data.get("listing") or request.data.get("listing_id") or None
    listing = _get_owner_listing(request, listing_id)
    if isinstance(listing, Response):
        return listing

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


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsOwnerRole])
def owner_maintenance_request_detail(request, req_id):
    try:
        m = MaintenanceRequest.objects.get(id=req_id, owner=request.user)
    except MaintenanceRequest.DoesNotExist:
        return Response({"detail": "Maintenance request not found."}, status=status.HTTP_404_NOT_FOUND)

    return Response(_maintenance_to_dict(m), status=status.HTTP_200_OK)


@api_view(["PATCH", "PUT"])
@permission_classes([IsAuthenticated, IsOwnerRole])
def owner_update_maintenance_request(request, req_id):
    try:
        m = MaintenanceRequest.objects.get(id=req_id, owner=request.user)
    except MaintenanceRequest.DoesNotExist:
        return Response({"detail": "Maintenance request not found."}, status=status.HTTP_404_NOT_FOUND)

    allowed_categories = {
        "plumbing", "electrical", "cleaning", "internet", "gas",
        "hvac", "pest_control", "carpentry", "painting", "other"
    }
    allowed_priorities = {"low", "medium", "high", "emergency"}
    allowed_statuses = {"open", "in_progress", "resolved", "rejected"}

    title = request.data.get("title", None)
    description = request.data.get("description", None)
    category = request.data.get("category", None)
    priority = request.data.get("priority", None)
    status_value = request.data.get("status", None)

    # listing can be passed as listing_id or listing
    has_listing_key = ("listing_id" in request.data) or ("listing" in request.data)
    listing_id = request.data.get("listing_id", request.data.get("listing", None))

    changed_fields = []

    if title is not None:
        title = str(title).strip()
        if not title:
            return Response({"detail": "Title cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)
        m.title = title
        changed_fields.append("title")

    if description is not None:
        description = str(description).strip()
        if not description:
            return Response({"detail": "Description cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)
        m.description = description
        changed_fields.append("description")

    if category is not None:
        category = str(category).strip()
        if category not in allowed_categories:
            return Response({"detail": "Invalid category."}, status=status.HTTP_400_BAD_REQUEST)
        m.category = category
        changed_fields.append("category")

    if priority is not None:
        priority = str(priority).strip()
        if priority not in allowed_priorities:
            return Response({"detail": "Invalid priority."}, status=status.HTTP_400_BAD_REQUEST)
        m.priority = priority
        changed_fields.append("priority")

    if status_value is not None:
        status_value = str(status_value).strip()
        if status_value not in allowed_statuses:
            return Response({"detail": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)
        m.status = status_value
        changed_fields.append("status")

    if has_listing_key:
        listing = _get_owner_listing(request, listing_id)
        if isinstance(listing, Response):
            return listing
        m.listing = listing
        changed_fields.append("listing")

    if not changed_fields:
        return Response(
            {"detail": "No valid fields provided for update."},
            status=status.HTTP_400_BAD_REQUEST
        )

    changed_fields.append("updated_at")
    m.save(update_fields=changed_fields)

    if m.assigned_provider:
        _create_notification(
            user=m.assigned_provider,
            title="Maintenance request updated",
            message=f"{_user_display_name(request.user)} updated '{m.title or f'Maintenance #{m.id}'}'.",
            link=f"/provider/chat/{m.id}",
        )

    return Response(_maintenance_to_dict(m), status=status.HTTP_200_OK)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated, IsOwnerRole])
def owner_delete_maintenance_request(request, req_id):
    try:
        m = MaintenanceRequest.objects.get(id=req_id, owner=request.user)
    except MaintenanceRequest.DoesNotExist:
        return Response({"detail": "Maintenance request not found."}, status=status.HTTP_404_NOT_FOUND)

    provider = m.assigned_provider
    title = m.title or f"Maintenance #{m.id}"
    req_id_value = m.id

    m.delete()

    if provider:
        _create_notification(
            user=provider,
            title="Maintenance request deleted",
            message=f"{_user_display_name(request.user)} deleted '{title}'.",
            link="",
        )

    return Response(
        {"detail": f"Maintenance request #{req_id_value} deleted successfully."},
        status=status.HTTP_200_OK
    )


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