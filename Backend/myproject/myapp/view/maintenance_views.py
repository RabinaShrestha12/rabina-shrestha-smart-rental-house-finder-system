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


# =========================
# OWNER (creates maintenance request)
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsOwnerRole])
def owner_create_maintenance_request(request):
    """
    Owner creates a maintenance request (listing optional).

    Accepts (any):
      - listing or listing_id (optional)
      - category
      - priority
      - title (required)
      - description or message (required)
    """

    # ✅ IMPORTANT: treat "" or "   " as None
    listing_id = (request.data.get("listing") or request.data.get("listing_id") or "").strip()
    if listing_id == "":
        listing_id = None

    listing = None
    if listing_id is not None:
        try:
            listing = Listing.objects.get(id=int(listing_id), owner=request.user)
        except (ValueError, TypeError):
            return Response({"detail": "listing_id must be a number"}, status=status.HTTP_400_BAD_REQUEST)
        except Listing.DoesNotExist:
            return Response({"detail": "Listing not found or not yours."}, status=status.HTTP_404_NOT_FOUND)

    category = (request.data.get("category") or "other").strip()
    priority = (request.data.get("priority") or "medium").strip()

    title = (request.data.get("title") or "").strip()
    description = (request.data.get("description") or request.data.get("message") or "").strip()

    if not title or not description:
        return Response({"detail": "title and description are required"}, status=status.HTTP_400_BAD_REQUEST)

    # ✅ Create (listing can be None)
    obj = MaintenanceRequest.objects.create(
        owner=request.user,
        listing=listing,  # may be None (DB must allow NULL)
        category=category,
        priority=priority,
        title=title,
        description=description,
        status="open",
    )

    return Response(
        {
            "id": obj.id,
            "listing": obj.listing_id,
            "listing_title": getattr(obj.listing, "title", "") if obj.listing else "",
            "assigned_provider": obj.assigned_provider_id,
            "category": obj.category,
            "priority": obj.priority,
            "status": obj.status,
            "title": obj.title,
            "description": obj.description,
            "created_at": obj.created_at,
            "updated_at": obj.updated_at,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsOwnerRole])
def owner_maintenance_requests(request):
    qs = MaintenanceRequest.objects.filter(owner=request.user).select_related(
        "listing", "assigned_provider", "assigned_provider__user"
    ).order_by("-created_at")

    data = []
    for x in qs:
        data.append({
            "id": x.id,
            "listing": x.listing_id,
            "listing_title": getattr(x.listing, "title", "") if x.listing else "",
            "category": x.category,
            "priority": x.priority,
            "status": x.status,
            "title": x.title,
            "description": x.description,
            "assigned_provider": x.assigned_provider_id,
            "assigned_provider_name": x.assigned_provider.user.username if x.assigned_provider else None,
            "created_at": x.created_at,
            "updated_at": x.updated_at,
        })
    return Response(data, status=status.HTTP_200_OK)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated, IsOwnerRole])
def owner_update_maintenance_status(request, req_id):
    try:
        obj = MaintenanceRequest.objects.get(id=req_id, owner=request.user)
    except MaintenanceRequest.DoesNotExist:
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

    new_status = (request.data.get("status") or "").strip()
    if not new_status:
        return Response({"detail": "status is required"}, status=status.HTTP_400_BAD_REQUEST)

    allowed = {"open", "in_progress", "resolved", "rejected"}
    if new_status not in allowed:
        return Response({"detail": f"Invalid status. Allowed: {sorted(allowed)}"}, status=status.HTTP_400_BAD_REQUEST)

    obj.status = new_status
    obj.save(update_fields=["status", "updated_at"])

    if obj.assigned_provider:
        _create_notification(
            user=obj.assigned_provider.user,
            title="Job status updated",
            message=f"Owner updated request #{obj.id} to {obj.status}",
            link="/dashboard/provider",
        )

    return Response({"id": obj.id, "status": obj.status}, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsOwnerRole])
def owner_available_providers(request):
    category = (request.query_params.get("category") or "").strip()
    service_area = (request.query_params.get("service_area") or "").strip()

    qs = ServiceProviderProfile.objects.select_related("user").all()

    if category:
        qs = qs.filter(category=category)
    if service_area:
        qs = qs.filter(service_area__icontains=service_area)

    data = []
    for p in qs.order_by("availability", "user__username"):
        data.append({
            "id": p.id,
            "username": p.user.username,
            "email": p.user.email,
            "phone": p.phone or getattr(p.user, "phone", ""),
            "category": p.category,
            "service_area": p.service_area,
            "availability": p.availability,
            "bio": p.bio,
        })

    return Response(data, status=status.HTTP_200_OK)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated, IsOwnerRole])
def owner_assign_provider(request, req_id):
    provider_profile_id = request.data.get("provider_profile_id")
    if not provider_profile_id:
        return Response({"detail": "provider_profile_id is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        obj = MaintenanceRequest.objects.get(id=req_id, owner=request.user)
    except MaintenanceRequest.DoesNotExist:
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

    try:
        provider_profile = ServiceProviderProfile.objects.select_related("user").get(id=int(provider_profile_id))
    except (ValueError, TypeError):
        return Response({"detail": "provider_profile_id must be a number"}, status=status.HTTP_400_BAD_REQUEST)
    except ServiceProviderProfile.DoesNotExist:
        return Response({"detail": "Provider profile not found"}, status=status.HTTP_404_NOT_FOUND)

    obj.assigned_provider = provider_profile
    obj.status = "in_progress"
    obj.save(update_fields=["assigned_provider", "status", "updated_at"])

    _create_notification(
        user=provider_profile.user,
        title="New job assigned",
        message=f"You were assigned request #{obj.id}: {obj.title}",
        link="/dashboard/provider",
    )

    return Response(
        {
            "id": obj.id,
            "assigned_provider": provider_profile.id,
            "assigned_provider_name": provider_profile.user.username,
            "status": obj.status,
        },
        status=status.HTTP_200_OK,
    )


# =========================
# PROVIDER
# =========================
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsProviderRole])
def provider_my_jobs(request):
    try:
        profile = ServiceProviderProfile.objects.get(user=request.user)
    except ServiceProviderProfile.DoesNotExist:
        return Response({"detail": "Provider profile not found."}, status=status.HTTP_404_NOT_FOUND)

    qs = MaintenanceRequest.objects.filter(assigned_provider=profile).select_related("listing").order_by("-created_at")

    data = []
    for x in qs:
        data.append({
            "id": x.id,
            "listing": x.listing_id,
            "listing_title": getattr(x.listing, "title", "") if x.listing else "",
            "category": x.category,
            "priority": x.priority,
            "status": x.status,
            "title": x.title,
            "description": x.description,
            "created_at": x.created_at,
            "updated_at": x.updated_at,
        })
    return Response(data, status=status.HTTP_200_OK)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated, IsProviderRole])
def provider_update_job_status(request, req_id):
    try:
        profile = ServiceProviderProfile.objects.get(user=request.user)
    except ServiceProviderProfile.DoesNotExist:
        return Response({"detail": "Provider profile not found."}, status=status.HTTP_404_NOT_FOUND)

    try:
        obj = MaintenanceRequest.objects.get(id=req_id, assigned_provider=profile)
    except MaintenanceRequest.DoesNotExist:
        return Response({"detail": "Job not found"}, status=status.HTTP_404_NOT_FOUND)

    new_status = (request.data.get("status") or "").strip()
    if not new_status:
        return Response({"detail": "status is required"}, status=status.HTTP_400_BAD_REQUEST)

    allowed = {"open", "in_progress", "resolved", "rejected"}
    if new_status not in allowed:
        return Response({"detail": f"Invalid status. Allowed: {sorted(allowed)}"}, status=status.HTTP_400_BAD_REQUEST)

    obj.status = new_status
    obj.save(update_fields=["status", "updated_at"])

    _create_notification(
        user=obj.owner,
        title="Provider updated job",
        message=f"Request #{obj.id} status changed to {obj.status} by provider",
        link="/owner/maintenance",
    )

    return Response({"id": obj.id, "status": obj.status}, status=status.HTTP_200_OK)
