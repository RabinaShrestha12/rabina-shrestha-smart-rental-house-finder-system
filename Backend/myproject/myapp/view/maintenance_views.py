from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..models import Listing, MaintenanceRequest, ServiceProviderProfile, Notification
from .permissions import IsOwnerRole, IsProviderRole


def _create_notification(user, title, message, link=""):
    try:
        Notification.objects.create(
            user=user,
            title=title,
            message=message,
            link=link or "",
        )
    except Exception:
        pass


def _maintenance_to_dict(m: MaintenanceRequest):
    return {
        "id": m.id,
        "owner_id": m.owner_id,
        "listing_id": m.listing_id,
        "assigned_provider_id": m.assigned_provider_id,
        "assigned_provider_name": (m.assigned_provider.user.get_full_name() or m.assigned_provider.user.username)
        if m.assigned_provider else "",
        "assigned_provider_category": (m.assigned_provider.category if m.assigned_provider else ""),
        "category": m.category,
        "priority": m.priority,
        "status": m.status,
        "title": m.title,
        "description": m.description,
        "created_at": m.created_at,
        "updated_at": m.updated_at,
    }


# =========================
# OWNER: create maintenance request (listing OPTIONAL)
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsOwnerRole])
def owner_create_maintenance_request(request):
    title = (request.data.get("title") or "").strip()
    description = (request.data.get("description") or "").strip()
    category = (request.data.get("category") or "other").strip()
    priority = (request.data.get("priority") or "medium").strip()

    if not title:
        return Response({"detail": "Title is required."}, status=status.HTTP_400_BAD_REQUEST)

    # listing optional
    listing_id = request.data.get("listing") or request.data.get("listing_id") or ""
    listing = None
    if str(listing_id).strip():
        try:
            listing = Listing.objects.get(id=int(listing_id), owner=request.user)
        except (Listing.DoesNotExist, ValueError):
            return Response({"detail": "Listing not found or not yours."}, status=status.HTTP_404_NOT_FOUND)

    m = MaintenanceRequest.objects.create(
        owner=request.user,
        listing=listing,                 # ✅ can be None
        assigned_provider=None,          # ✅ not assigned yet
        category=category,
        priority=priority,
        status="open",
        title=title,
        description=description,
    )
    return Response(_maintenance_to_dict(m), status=status.HTTP_201_CREATED)


# =========================
# OWNER: list my maintenance requests
# =========================
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsOwnerRole])
def owner_maintenance_requests(request):
    qs = MaintenanceRequest.objects.filter(owner=request.user).order_by("-created_at")
    return Response([_maintenance_to_dict(x) for x in qs], status=status.HTTP_200_OK)


# =========================
# OWNER: update status
# =========================
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

    # notify provider if assigned
    if m.assigned_provider:
        _create_notification(
            user=m.assigned_provider.user,
            title="Maintenance status updated",
            message=f"Owner updated maintenance #{m.id} to {m.status}",
            link=f"/provider/jobs/{m.id}",
        )

    return Response(_maintenance_to_dict(m), status=status.HTTP_200_OK)


# =========================
# OWNER: get available providers (filter by category/service_area optional)
# =========================
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsOwnerRole])
def owner_available_providers(request):
    category = (request.query_params.get("category") or "").strip().lower()
    area = (request.query_params.get("service_area") or "").strip().lower()

    qs = ServiceProviderProfile.objects.select_related("user").all()

    # optionally filter
    if category and category != "all":
        qs = qs.filter(category=category)

    if area:
        qs = qs.filter(service_area__icontains=area)

    # you can also filter by availability if you want:
    # qs = qs.filter(availability="available")

    data = []
    for p in qs.order_by("-updated_at"):
        data.append({
            "id": p.id,
            "user_id": p.user_id,
            "name": (p.user.get_full_name() or p.user.username),
            "email": p.user.email,
            "phone": p.phone or p.user.phone,
            "category": p.category,
            "service_area": p.service_area,
            "availability": p.availability,
            "bio": p.bio,
        })
    return Response(data, status=status.HTTP_200_OK)


# =========================
# OWNER: assign provider to a maintenance request
# body: { "provider_profile_id": 123 }  OR { "provider_id": 123 }
# =========================
@api_view(["POST"])
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

    m.assigned_provider = profile
    m.status = "in_progress" if m.status == "open" else m.status
    m.save(update_fields=["assigned_provider", "status", "updated_at"])

    # notify provider user
    _create_notification(
        user=profile.user,
        title="New maintenance job assigned",
        message=f"You have been assigned maintenance #{m.id} ({m.category})",
        link=f"/provider/jobs/{m.id}",
    )

    return Response(_maintenance_to_dict(m), status=status.HTTP_200_OK)


# =========================
# PROVIDER: my assigned jobs
# =========================
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsProviderRole])
def provider_my_jobs(request):
    qs = MaintenanceRequest.objects.filter(assigned_provider__user=request.user).order_by("-created_at")
    return Response([_maintenance_to_dict(x) for x in qs], status=status.HTTP_200_OK)


# =========================
# PROVIDER: update job status
# =========================
@api_view(["PATCH", "POST"])
@permission_classes([IsAuthenticated, IsProviderRole])
def provider_update_job_status(request, req_id):
    new_status = (request.data.get("status") or "").strip()
    allowed = {"open", "in_progress", "resolved", "rejected"}
    if new_status not in allowed:
        return Response({"detail": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        m = MaintenanceRequest.objects.get(id=req_id, assigned_provider__user=request.user)
    except MaintenanceRequest.DoesNotExist:
        return Response({"detail": "Job not found."}, status=status.HTTP_404_NOT_FOUND)

    m.status = new_status
    m.save(update_fields=["status", "updated_at"])

    # notify owner
    _create_notification(
        user=m.owner,
        title="Provider updated maintenance status",
        message=f"Provider updated maintenance #{m.id} to {m.status}",
        link=f"/owner/maintenance/{m.id}",
    )

    return Response(_maintenance_to_dict(m), status=status.HTTP_200_OK)