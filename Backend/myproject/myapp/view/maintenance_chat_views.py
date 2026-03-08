# myapp/view/maintenance_chat_views.py
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


def _user_display_name(user):
    if not user:
        return ""
    full_name = ""
    try:
        full_name = (user.get_full_name() or "").strip()
    except Exception:
        full_name = ""
    return full_name or getattr(user, "username", "") or getattr(user, "email", "") or "Unknown"


def _user_email(user):
    if not user:
        return ""
    return getattr(user, "email", "") or ""


def _message_sender_role(msg: ProviderMessage):
    """
    Decide sender role safely using ids first.
    """
    if msg.sender_id and msg.owner_id and msg.sender_id == msg.owner_id:
        return "owner"
    if msg.sender_id and msg.provider_id and msg.sender_id == msg.provider_id:
        return "provider"

    raw_role = str(getattr(msg.sender, "role", "") or "").strip().lower()
    if raw_role in {"owner", "provider", "service_provider", "service provider"}:
        if raw_role.startswith("service"):
            return "provider"
        return raw_role

    return "unknown"


def _chat_is_open(job: MaintenanceRequest) -> bool:
    if job.assigned_provider is None:
        return False
    if job.status == "rejected":
        return False
    return True


def msg_to_dict(m: ProviderMessage):
    sender_role = _message_sender_role(m)

    return {
        "id": m.id,
        "maintenance_id": m.maintenance_id,
        "owner_id": m.owner_id,
        "provider_id": m.provider_id,
        "sender_id": m.sender_id,
        "text": m.text,
        "message": m.text,  # frontend-friendly alias
        "created_at": m.created_at,
        "is_read": m.is_read,

        "sender_role": sender_role,
        "sender_name": _user_display_name(m.sender),
        "sender_email": _user_email(m.sender),

        "owner_name": _user_display_name(m.owner),
        "owner_email": _user_email(m.owner),

        "provider_name": _user_display_name(m.provider),
        "provider_email": _user_email(m.provider),
    }


# -----------------------------
# OWNER SIDE
# -----------------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsOwnerRole])
def owner_get_maintenance_messages(request, req_id):
    try:
        job = MaintenanceRequest.objects.get(id=req_id, owner=request.user)
    except MaintenanceRequest.DoesNotExist:
        return Response(
            {"detail": "Maintenance request not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    qs = ProviderMessage.objects.filter(maintenance=job).order_by("created_at")

    # mark provider -> owner messages as read
    qs.filter(provider=job.assigned_provider, sender=job.assigned_provider, is_read=False).update(is_read=True)

    return Response([msg_to_dict(m) for m in qs], status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsOwnerRole])
def owner_send_maintenance_message(request, req_id):
    text = (request.data.get("message") or request.data.get("text") or "").strip()
    if not text:
        return Response(
            {"detail": "Message is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        job = MaintenanceRequest.objects.get(id=req_id, owner=request.user)
    except MaintenanceRequest.DoesNotExist:
        return Response(
            {"detail": "Maintenance request not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    if not _chat_is_open(job):
        return Response(
            {"detail": "Chat is not available yet. Assign a provider first (and not rejected)."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    provider_user = job.assigned_provider

    msg = ProviderMessage.objects.create(
        maintenance=job,
        owner=request.user,
        provider=provider_user,
        sender=request.user,
        text=text,
        is_read=False,
    )

    owner_name = _user_display_name(request.user)
    maintenance_title = job.title or f"Maintenance #{job.id}"

    _create_notification(
        user=provider_user,
        title="New owner message",
        message=f"{owner_name} sent a message about '{maintenance_title}'",
        link=f"/provider/chat/{job.id}",
    )

    return Response(msg_to_dict(msg), status=status.HTTP_201_CREATED)


# -----------------------------
# PROVIDER SIDE
# -----------------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsProviderRole])
def provider_inbox(request):
    qs = MaintenanceRequest.objects.filter(
        assigned_provider=request.user
    ).order_by("-updated_at", "-created_at")

    data = []
    for j in qs:
        last_msg = ProviderMessage.objects.filter(maintenance=j).order_by("-created_at").first()
        unread_count = ProviderMessage.objects.filter(
            maintenance=j,
            sender=j.owner,
            is_read=False
        ).count()

        data.append({
            "id": j.id,
            "owner_id": j.owner_id,
            "owner_name": _user_display_name(j.owner),
            "owner_email": _user_email(j.owner),

            "provider_id": request.user.id,
            "provider_name": _user_display_name(request.user),
            "provider_email": _user_email(request.user),

            "status": j.status,
            "priority": j.priority,
            "category": j.category,
            "title": j.title,
            "description": j.description,
            "created_at": j.created_at,
            "updated_at": j.updated_at,

            "last_message": last_msg.text if last_msg else "",
            "last_message_at": last_msg.created_at if last_msg else None,
            "last_message_sender_role": _message_sender_role(last_msg) if last_msg else "",
            "unread_count": unread_count,
            "has_unread": unread_count > 0,
        })

    return Response(data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsProviderRole])
def provider_get_job_messages(request, req_id):
    try:
        job = MaintenanceRequest.objects.get(id=req_id, assigned_provider=request.user)
    except MaintenanceRequest.DoesNotExist:
        return Response(
            {"detail": "Job not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    if job.status == "rejected":
        return Response(
            {"detail": "Chat is closed because the job is rejected."},
            status=status.HTTP_400_BAD_REQUEST
        )

    qs = ProviderMessage.objects.filter(maintenance=job).order_by("created_at")

    # mark owner -> provider messages as read
    qs.filter(owner=job.owner, sender=job.owner, is_read=False).update(is_read=True)

    return Response([msg_to_dict(m) for m in qs], status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsProviderRole])
def provider_send_job_message(request, req_id):
    text = (request.data.get("message") or request.data.get("text") or "").strip()
    if not text:
        return Response(
            {"detail": "Message is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        job = MaintenanceRequest.objects.get(id=req_id, assigned_provider=request.user)
    except MaintenanceRequest.DoesNotExist:
        return Response(
            {"detail": "Job not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    if job.status == "rejected":
        return Response(
            {"detail": "Chat is closed because the job is rejected."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    msg = ProviderMessage.objects.create(
        maintenance=job,
        owner=job.owner,
        provider=request.user,
        sender=request.user,
        text=text,
        is_read=False,
    )

    provider_name = _user_display_name(request.user)
    maintenance_title = job.title or f"Maintenance #{job.id}"

    _create_notification(
        user=job.owner,
        title="New provider message",
        message=f"{provider_name} sent a message about '{maintenance_title}'",
        link=f"/owner/maintenance/{job.id}",
    )

    return Response(msg_to_dict(msg), status=status.HTTP_201_CREATED)