# myapp/view/maintenance_views.py

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..models import Tenant, Owner, Listing, MaintenanceRequest
from ..serializers import MaintenanceRequestSerializer
from .permissions import IsTenantRole, IsOwnerRole


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsTenantRole])
def tenant_create_maintenance_request(request):
    """
    POST /api/tenant/maintenance/create/
    Body: listing_id, category, priority, title, description

    Safe: creates Tenant/Owner rows if missing.
    """
    tenant_obj, _ = Tenant.objects.get_or_create(user=request.user)

    listing_id = request.data.get("listing_id") or request.data.get("listing")
    if not listing_id:
        return Response({"detail": "listing_id is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        listing = Listing.objects.get(id=int(listing_id))
    except (ValueError, TypeError):
        return Response({"detail": "listing_id must be a number"}, status=status.HTTP_400_BAD_REQUEST)
    except Listing.DoesNotExist:
        return Response({"detail": "Listing not found"}, status=status.HTTP_404_NOT_FOUND)

    # If Listing.owner is a User
    owner_obj, _ = Owner.objects.get_or_create(user=listing.owner)

    category = request.data.get("category") or request.data.get("issue_type") or "other"
    priority = request.data.get("priority") or "medium"
    title = request.data.get("title") or "Maintenance request"
    description = request.data.get("description") or request.data.get("message") or ""

    payload = {
        "listing": listing.id,
        "tenant": tenant_obj.id,
        "owner": owner_obj.id,
        "category": category,
        "priority": priority,
        "title": title,
        "description": description,
    }

    serializer = MaintenanceRequestSerializer(data=payload)
    if serializer.is_valid():
        obj = serializer.save()
        return Response(MaintenanceRequestSerializer(obj).data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsTenantRole])
def tenant_my_maintenance_requests(request):
    """
    GET /api/tenant/maintenance/
    """
    tenant_obj, _ = Tenant.objects.get_or_create(user=request.user)
    qs = MaintenanceRequest.objects.filter(tenant=tenant_obj).order_by("-created_at")
    return Response(MaintenanceRequestSerializer(qs, many=True).data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsOwnerRole])
def owner_maintenance_requests(request):
    """
    GET /api/owner/maintenance/
    """
    owner_obj, _ = Owner.objects.get_or_create(user=request.user)
    qs = MaintenanceRequest.objects.filter(owner=owner_obj).order_by("-created_at")
    return Response(MaintenanceRequestSerializer(qs, many=True).data, status=status.HTTP_200_OK)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated, IsOwnerRole])
def owner_update_maintenance_status(request, req_id):
    """
    PATCH /api/owner/maintenance/<req_id>/status/
    Body: { status: "accepted" | "in_progress" | "resolved" | "rejected" }
    """
    owner_obj, _ = Owner.objects.get_or_create(user=request.user)

    try:
        obj = MaintenanceRequest.objects.get(id=req_id, owner=owner_obj)
    except MaintenanceRequest.DoesNotExist:
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

    new_status = request.data.get("status")
    if not new_status:
        return Response({"detail": "status is required"}, status=status.HTTP_400_BAD_REQUEST)

    obj.status = str(new_status).lower()
    obj.save()
    return Response(MaintenanceRequestSerializer(obj).data, status=status.HTTP_200_OK)
