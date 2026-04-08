# myapp/view/maintenance_chat_views.py
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

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


def _build_image_url(request, msg):
    if getattr(msg, "image", None):
        try:
            if request:
                return request.build_absolute_uri(msg.image.url)
            return msg.image.url
        except Exception:
            return None
    return None


def _get_text_from_message(msg):
    if hasattr(msg, "text"):
        return msg.text
    if hasattr(msg, "message"):
        return msg.message
    if hasattr(msg, "content"):
        return msg.content
    return ""


def _set_text_on_message(msg, value):
    if hasattr(msg, "text"):
        msg.text = value
        return "text"
    if hasattr(msg, "message"):
        msg.message = value
        return "message"
    if hasattr(msg, "content"):
        msg.content = value
        return "content"
    return None


def msg_to_dict(m: ProviderMessage, request=None):
    sender_role = _message_sender_role(m)
    image_url = _build_image_url(request, m)

    return {
        "id": m.id,
        "maintenance_id": m.maintenance_id,
        "owner_id": m.owner_id,
        "provider_id": m.provider_id,
        "sender_id": m.sender_id,

        "text": getattr(m, "text", ""),
        "message": getattr(m, "text", ""),  # frontend-friendly alias

        "image": getattr(m.image, "url", None) if getattr(m, "image", None) else None,
        "image_url": image_url,

        "created_at": m.created_at,
        "updated_at": getattr(m, "updated_at", None),
        "is_read": m.is_read,
        "is_deleted": getattr(m, "is_deleted", False),

        "sender_role": sender_role,
        "sender_name": _user_display_name(m.sender),
        "sender_email": _user_email(m.sender),

        "owner_name": _user_display_name(m.owner),
        "owner_email": _user_email(m.owner),

        "provider_name": _user_display_name(m.provider),
        "provider_email": _user_email(m.provider),
    }


def _get_owner_job_for_message(message_id, user):
    try:
        msg = ProviderMessage.objects.select_related("maintenance", "owner", "provider", "sender").get(id=message_id)
    except ProviderMessage.DoesNotExist:
        return None, None

    if msg.owner_id != user.id:
        return msg, None

    return msg, msg.maintenance


def _get_provider_job_for_message(message_id, user):
    try:
        msg = ProviderMessage.objects.select_related("maintenance", "owner", "provider", "sender").get(id=message_id)
    except ProviderMessage.DoesNotExist:
        return None, None

    if msg.provider_id != user.id:
        return msg, None

    return msg, msg.maintenance


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

    return Response([msg_to_dict(m, request) for m in qs], status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsOwnerRole])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def owner_send_maintenance_message(request, req_id):
    text = (request.data.get("message") or request.data.get("text") or "").strip()
    image = request.FILES.get("image")

    if not text and not image:
        return Response(
            {"detail": "Message text or image is required."},
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
        image=image,
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

    return Response(msg_to_dict(msg, request), status=status.HTTP_201_CREATED)


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated, IsOwnerRole])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def owner_update_maintenance_message(request, message_id):
    msg, job = _get_owner_job_for_message(message_id, request.user)

    if not msg:
        return Response(
            {"detail": "Message not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    if not job:
        return Response(
            {"detail": "Not allowed."},
            status=status.HTTP_403_FORBIDDEN
        )

    if msg.sender_id != request.user.id:
        return Response(
            {"detail": "You can only update your own message."},
            status=status.HTTP_403_FORBIDDEN
        )

    if not _chat_is_open(job):
        return Response(
            {"detail": "Chat is closed."},
            status=status.HTTP_400_BAD_REQUEST
        )

    new_text = request.data.get("text", None)
    if new_text is None:
        new_text = request.data.get("message", None)
    if new_text is None:
        new_text = request.data.get("body", None)

    new_image = request.FILES.get("image")
    remove_image_raw = request.data.get("remove_image", False)

    if isinstance(remove_image_raw, str):
        remove_image = remove_image_raw.lower() in ["true", "1", "yes"]
    else:
        remove_image = bool(remove_image_raw)

    updated_fields = []

    if new_text is not None:
        new_text = str(new_text).strip()
        text_field = _set_text_on_message(msg, new_text)
        if text_field:
            updated_fields.append(text_field)

    if new_image is not None and hasattr(msg, "image"):
        if msg.image:
            try:
                msg.image.delete(save=False)
            except Exception:
                pass
        msg.image = new_image
        updated_fields.append("image")

    elif remove_image and hasattr(msg, "image"):
        if msg.image:
            try:
                msg.image.delete(save=False)
            except Exception:
                pass
        msg.image = None
        updated_fields.append("image")

    current_text = str(_get_text_from_message(msg) or "").strip()
    has_image = bool(getattr(msg, "image", None))

    if not current_text and not has_image:
        return Response(
            {"detail": "Message cannot be empty. Add text or image."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if hasattr(msg, "updated_at"):
        msg.updated_at = timezone.now()
        updated_fields.append("updated_at")

    if not updated_fields:
        return Response(
            {"detail": "No changes provided."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    msg.save(update_fields=list(set(updated_fields)))

    return Response(
        {
            "detail": "Message updated successfully.",
            "message": msg_to_dict(msg, request),
        },
        status=status.HTTP_200_OK
    )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated, IsOwnerRole])
def owner_delete_maintenance_message(request, message_id):
    msg, job = _get_owner_job_for_message(message_id, request.user)

    if not msg:
        return Response(
            {"detail": "Message not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    if not job:
        return Response(
            {"detail": "Not allowed."},
            status=status.HTTP_403_FORBIDDEN
        )

    if msg.sender_id != request.user.id:
        return Response(
            {"detail": "You can only delete your own message."},
            status=status.HTTP_403_FORBIDDEN
        )

    # soft delete if supported
    if hasattr(msg, "is_deleted"):
        msg.is_deleted = True
        fields = ["is_deleted"]

        if hasattr(msg, "deleted_at"):
            msg.deleted_at = timezone.now()
            fields.append("deleted_at")

        text_field = _set_text_on_message(msg, "[deleted]")
        if text_field:
            fields.append(text_field)

        if hasattr(msg, "image") and msg.image:
            try:
                msg.image.delete(save=False)
            except Exception:
                pass
            msg.image = None
            fields.append("image")

        msg.save(update_fields=list(set(fields)))

        return Response(
            {"detail": "Message deleted successfully."},
            status=status.HTTP_200_OK
        )

    if hasattr(msg, "image") and msg.image:
        try:
            msg.image.delete(save=False)
        except Exception:
            pass

    msg.delete()
    return Response(
        {"detail": "Message deleted successfully."},
        status=status.HTTP_200_OK
    )


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

            "last_message": getattr(last_msg, "text", "") if last_msg else "",
            "last_message_image_url": _build_image_url(request, last_msg) if last_msg else None,
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

    return Response([msg_to_dict(m, request) for m in qs], status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsProviderRole])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def provider_send_job_message(request, req_id):
    text = (request.data.get("message") or request.data.get("text") or "").strip()
    image = request.FILES.get("image")

    if not text and not image:
        return Response(
            {"detail": "Message text or image is required."},
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
        image=image,
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

    return Response(msg_to_dict(msg, request), status=status.HTTP_201_CREATED)


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated, IsProviderRole])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def provider_update_job_message(request, message_id):
    msg, job = _get_provider_job_for_message(message_id, request.user)

    if not msg:
        return Response(
            {"detail": "Message not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    if not job:
        return Response(
            {"detail": "Not allowed."},
            status=status.HTTP_403_FORBIDDEN
        )

    if msg.sender_id != request.user.id:
        return Response(
            {"detail": "You can only update your own message."},
            status=status.HTTP_403_FORBIDDEN
        )

    if job.status == "rejected":
        return Response(
            {"detail": "Chat is closed because the job is rejected."},
            status=status.HTTP_400_BAD_REQUEST
        )

    new_text = request.data.get("text", None)
    if new_text is None:
        new_text = request.data.get("message", None)
    if new_text is None:
        new_text = request.data.get("body", None)

    new_image = request.FILES.get("image")
    remove_image_raw = request.data.get("remove_image", False)

    if isinstance(remove_image_raw, str):
        remove_image = remove_image_raw.lower() in ["true", "1", "yes"]
    else:
        remove_image = bool(remove_image_raw)

    updated_fields = []

    if new_text is not None:
        new_text = str(new_text).strip()
        text_field = _set_text_on_message(msg, new_text)
        if text_field:
            updated_fields.append(text_field)

    if new_image is not None and hasattr(msg, "image"):
        if msg.image:
            try:
                msg.image.delete(save=False)
            except Exception:
                pass
        msg.image = new_image
        updated_fields.append("image")

    elif remove_image and hasattr(msg, "image"):
        if msg.image:
            try:
                msg.image.delete(save=False)
            except Exception:
                pass
        msg.image = None
        updated_fields.append("image")

    current_text = str(_get_text_from_message(msg) or "").strip()
    has_image = bool(getattr(msg, "image", None))

    if not current_text and not has_image:
        return Response(
            {"detail": "Message cannot be empty. Add text or image."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if hasattr(msg, "updated_at"):
        msg.updated_at = timezone.now()
        updated_fields.append("updated_at")

    if not updated_fields:
        return Response(
            {"detail": "No changes provided."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    msg.save(update_fields=list(set(updated_fields)))

    return Response(
        {
            "detail": "Message updated successfully.",
            "message": msg_to_dict(msg, request),
        },
        status=status.HTTP_200_OK
    )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated, IsProviderRole])
def provider_delete_job_message(request, message_id):
    msg, job = _get_provider_job_for_message(message_id, request.user)

    if not msg:
        return Response(
            {"detail": "Message not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    if not job:
        return Response(
            {"detail": "Not allowed."},
            status=status.HTTP_403_FORBIDDEN
        )

    if msg.sender_id != request.user.id:
        return Response(
            {"detail": "You can only delete your own message."},
            status=status.HTTP_403_FORBIDDEN
        )

    if hasattr(msg, "is_deleted"):
        msg.is_deleted = True
        fields = ["is_deleted"]

        if hasattr(msg, "deleted_at"):
            msg.deleted_at = timezone.now()
            fields.append("deleted_at")

        text_field = _set_text_on_message(msg, "[deleted]")
        if text_field:
            fields.append(text_field)

        if hasattr(msg, "image") and msg.image:
            try:
                msg.image.delete(save=False)
            except Exception:
                pass
            msg.image = None
            fields.append("image")

        msg.save(update_fields=list(set(fields)))

        return Response(
            {"detail": "Message deleted successfully."},
            status=status.HTTP_200_OK
        )

    if hasattr(msg, "image") and msg.image:
        try:
            msg.image.delete(save=False)
        except Exception:
            pass

    msg.delete()
    return Response(
        {"detail": "Message deleted successfully."},
        status=status.HTTP_200_OK
    )