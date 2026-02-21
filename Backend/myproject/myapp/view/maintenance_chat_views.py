from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..models import MaintenanceRequest, ProviderMessage, Notification
from .permissions import IsOwnerRole, IsProviderRole


def _create_notification(user, title, message, link=""):
    try:
        Notification.objects.create(
            user=user,
            title=title,
            message=message,
            link=link or ""
        )
    except Exception:
        pass


def msg_to_dict(m: ProviderMessage):
    return {
        "id": m.id,
        "maintenance_id": m.maintenance_id,
        "owner_id": m.owner_id,
        "provider_id": m.provider_id,
        "sender_role": m.sender_role,
        "message": m.message,
        "created_at": m.created_at,
    }


# =========================
# OWNER: get messages
# =========================
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsOwnerRole])
def owner_get_maintenance_messages(request, req_id):
    try:
        job = MaintenanceRequest.objects.get(id=req_id, owner=request.user)
    except MaintenanceRequest.DoesNotExist:
        return Response({"detail": "Maintenance request not found."}, status=status.HTTP_404_NOT_FOUND)

    qs = ProviderMessage.objects.filter(maintenance=job).order_by("created_at")
    return Response([msg_to_dict(m) for m in qs], status=status.HTTP_200_OK)


# =========================
# OWNER: send message
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsOwnerRole])
def owner_send_maintenance_message(request, req_id):
    text = (request.data.get("message") or "").strip()
    if not text:
        return Response({"detail": "Message is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        job = MaintenanceRequest.objects.get(id=req_id, owner=request.user)
    except MaintenanceRequest.DoesNotExist:
        return Response({"detail": "Maintenance request not found."}, status=status.HTTP_404_NOT_FOUND)

    if not job.provider:
        return Response({"detail": "No provider assigned yet."}, status=status.HTTP_400_BAD_REQUEST)

    msg = ProviderMessage.objects.create(
        maintenance=job,
        owner=request.user,
        provider=job.provider,
        sender_role="owner",
        message=text
    )

    # notify provider
    _create_notification(
        user=job.provider,
        title="New maintenance message",
        message=f"Owner sent a message for maintenance #{job.id}",
        link=f"/provider/jobs/{job.id}"
    )

    return Response(msg_to_dict(msg), status=status.HTTP_201_CREATED)


# =========================
# PROVIDER: inbox list
# =========================
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsProviderRole])
def provider_inbox(request):
    qs = MaintenanceRequest.objects.filter(provider=request.user).order_by("-created_at")
    data = []
    for j in qs:
        data.append({
            "id": j.id,
            "status": getattr(j, "status", ""),
            "priority": getattr(j, "priority", ""),
            "category": getattr(j, "category", ""),
            "created_at": j.created_at,
            "owner_id": j.owner_id,
        })
    return Response(data, status=status.HTTP_200_OK)


# =========================
# PROVIDER: get job messages
# =========================
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsProviderRole])
def provider_get_job_messages(request, req_id):
    try:
        job = MaintenanceRequest.objects.get(id=req_id, provider=request.user)
    except MaintenanceRequest.DoesNotExist:
        return Response({"detail": "Job not found."}, status=status.HTTP_404_NOT_FOUND)

    qs = ProviderMessage.objects.filter(maintenance=job).order_by("created_at")
    return Response([msg_to_dict(m) for m in qs], status=status.HTTP_200_OK)


# =========================
# PROVIDER: send job message
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsProviderRole])
def provider_send_job_message(request, req_id):
    text = (request.data.get("message") or "").strip()
    if not text:
        return Response({"detail": "Message is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        job = MaintenanceRequest.objects.get(id=req_id, provider=request.user)
    except MaintenanceRequest.DoesNotExist:
        return Response({"detail": "Job not found."}, status=status.HTTP_404_NOT_FOUND)

    msg = ProviderMessage.objects.create(
        maintenance=job,
        owner=job.owner,
        provider=request.user,
        sender_role="provider",
        message=text
    )

    # notify owner
    _create_notification(
        user=job.owner,
        title="New maintenance message",
        message=f"Provider sent a message for maintenance #{job.id}",
        link=f"/owner/maintenance/{job.id}"
    )

    return Response(msg_to_dict(msg), status=status.HTTP_201_CREATED)