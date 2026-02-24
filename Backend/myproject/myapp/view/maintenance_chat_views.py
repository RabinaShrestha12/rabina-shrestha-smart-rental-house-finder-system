from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..models import MaintenanceRequest, ProviderMessage, Notification
from .permissions import IsOwnerRole, IsProviderRole


def _create_notification(user, title, message, link=""):
    try:
        Notification.objects.create(user=user, title=title, message=message, link=link or "")
    except Exception:
        pass


def msg_to_dict(m: ProviderMessage):
    return {
        "id": m.id,
        "maintenance_id": m.maintenance_id,
        "owner_id": m.owner_id,
        "provider_id": m.provider_id,
        "sender_id": m.sender_id,
        "text": m.text,
        "created_at": m.created_at,
        "is_read": m.is_read,
    }


# =========================
# OWNER: get messages for maintenance req
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
# OWNER: send message to assigned provider
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsOwnerRole])
def owner_send_maintenance_message(request, req_id):
    text = (request.data.get("message") or request.data.get("text") or "").strip()
    if not text:
        return Response({"detail": "Message is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        job = MaintenanceRequest.objects.get(id=req_id, owner=request.user)
    except MaintenanceRequest.DoesNotExist:
        return Response({"detail": "Maintenance request not found."}, status=status.HTTP_404_NOT_FOUND)

    if not job.assigned_provider:
        return Response({"detail": "No provider assigned yet."}, status=status.HTTP_400_BAD_REQUEST)

    provider_user = job.assigned_provider.user  # ✅ IMPORTANT (profile -> user)

    msg = ProviderMessage.objects.create(
        maintenance=job,
        owner=request.user,
        provider=provider_user,
        sender=request.user,
        text=text,
    )

    _create_notification(
        user=provider_user,
        title="New maintenance message",
        message=f"Owner sent a message for maintenance #{job.id}",
        link=f"/provider/jobs/{job.id}",
    )

    return Response(msg_to_dict(msg), status=status.HTTP_201_CREATED)


# =========================
# PROVIDER: inbox/jobs list (simple)
# =========================
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsProviderRole])
def provider_inbox(request):
    qs = MaintenanceRequest.objects.filter(assigned_provider__user=request.user).order_by("-created_at")
    data = []
    for j in qs:
        data.append({
            "id": j.id,
            "owner_id": j.owner_id,
            "status": j.status,
            "priority": j.priority,
            "category": j.category,
            "title": j.title,
            "created_at": j.created_at,
        })
    return Response(data, status=status.HTTP_200_OK)


# =========================
# PROVIDER: get messages for job
# =========================
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsProviderRole])
def provider_get_job_messages(request, req_id):
    try:
        job = MaintenanceRequest.objects.get(id=req_id, assigned_provider__user=request.user)
    except MaintenanceRequest.DoesNotExist:
        return Response({"detail": "Job not found."}, status=status.HTTP_404_NOT_FOUND)

    qs = ProviderMessage.objects.filter(maintenance=job).order_by("created_at")
    return Response([msg_to_dict(m) for m in qs], status=status.HTTP_200_OK)


# =========================
# PROVIDER: send message to owner
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsProviderRole])
def provider_send_job_message(request, req_id):
    text = (request.data.get("message") or request.data.get("text") or "").strip()
    if not text:
        return Response({"detail": "Message is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        job = MaintenanceRequest.objects.get(id=req_id, assigned_provider__user=request.user)
    except MaintenanceRequest.DoesNotExist:
        return Response({"detail": "Job not found."}, status=status.HTTP_404_NOT_FOUND)

    msg = ProviderMessage.objects.create(
        maintenance=job,
        owner=job.owner,
        provider=request.user,
        sender=request.user,
        text=text,
    )

    _create_notification(
        user=job.owner,
        title="New maintenance message",
        message=f"Provider sent a message for maintenance #{job.id}",
        link=f"/owner/maintenance/{job.id}",
    )

    return Response(msg_to_dict(msg), status=status.HTTP_201_CREATED)