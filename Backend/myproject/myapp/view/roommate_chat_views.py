from django.db.models import Q
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from ..models import RoommateChatThread, RoommateChatMessage, RoommateRequest
from .permissions import IsTenantRole
from ..serializers import RoommateChatThreadSerializer, RoommateChatMessageSerializer


def _allowed(thread: RoommateChatThread, user) -> bool:
    return thread.user1_id == user.id or thread.user2_id == user.id


def _ordered_pair(a_id: int, b_id: int):
    return (a_id, b_id) if a_id < b_id else (b_id, a_id)


def _sync_threads_for_user(user):
    """
    Create missing chat threads for all accepted roommate requests involving this user.
    Fixes older accepted requests that existed before thread-creation logic.
    IMPORTANT: RoommateChatThread model does NOT have 'title', so don't pass defaults with title.
    """
    accepted = RoommateRequest.objects.filter(
        Q(from_user=user) | Q(to_user=user),
        status="accepted"
    )

    created_ids = []
    for req in accepted:
        a, b = _ordered_pair(req.from_user_id, req.to_user_id)

        thread, created = RoommateChatThread.objects.get_or_create(
            user1_id=a,
            user2_id=b,
        )

        if created:
            created_ids.append(thread.id)

    return created_ids


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


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsTenantRole])
def roommate_sync_threads(request):
    """
    Call this once if chats are empty but requests are accepted.
    """
    user = request.user
    created_ids = _sync_threads_for_user(user)
    return Response({"created_thread_ids": created_ids}, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsTenantRole])
def roommate_my_threads(request):
    user = request.user

    _sync_threads_for_user(user)

    qs = RoommateChatThread.objects.filter(Q(user1=user) | Q(user2=user)).order_by("-id")
    ser = RoommateChatThreadSerializer(qs, many=True, context={"request": request})
    return Response({"results": ser.data}, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsTenantRole])
def roommate_thread_messages(request, thread_id: int):
    user = request.user

    try:
        thread = RoommateChatThread.objects.get(id=thread_id)
    except RoommateChatThread.DoesNotExist:
        return Response({"detail": "Thread not found"}, status=status.HTTP_404_NOT_FOUND)

    if not _allowed(thread, user):
        return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

    msgs = RoommateChatMessage.objects.filter(thread=thread).order_by("created_at")
    
    # Mark as read all incoming messages
    msgs.exclude(sender=user).filter(is_read=False).update(is_read=True)
    
    ser = RoommateChatMessageSerializer(msgs, many=True, context={"request": request})
    return Response({"thread_id": thread.id, "results": ser.data}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsTenantRole])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def roommate_send_message(request, thread_id: int):
    user = request.user
    text = str(
        request.data.get("text")
        or request.data.get("message")
        or request.data.get("body")
        or ""
    ).strip()
    image = request.FILES.get("image")

    if not text and not image:
        return Response(
            {"detail": "text or image is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        thread = RoommateChatThread.objects.get(id=thread_id)
    except RoommateChatThread.DoesNotExist:
        return Response({"detail": "Thread not found"}, status=status.HTTP_404_NOT_FOUND)

    if not _allowed(thread, user):
        return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

    try:
        msg = RoommateChatMessage.objects.create(
            thread=thread,
            sender=user,
            text=text,
            image=image,
        )
    except TypeError:
        try:
            msg = RoommateChatMessage.objects.create(
                thread=thread,
                sender=user,
                message=text,
                image=image,
            )
        except TypeError:
            msg = RoommateChatMessage.objects.create(
                thread=thread,
                sender=user,
                content=text,
                image=image,
            )

    return Response(
        RoommateChatMessageSerializer(msg, context={"request": request}).data,
        status=status.HTTP_201_CREATED
    )


# =========================
# UPDATE ROOMMATE MESSAGE
# PUT/PATCH /api/tenant/roommates/messages/<message_id>/update/
# =========================
@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated, IsTenantRole])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def roommate_update_message(request, message_id: int):
    user = request.user

    try:
        msg = RoommateChatMessage.objects.select_related("thread", "sender").get(id=message_id)
    except RoommateChatMessage.DoesNotExist:
        return Response({"detail": "Message not found"}, status=status.HTTP_404_NOT_FOUND)

    if not _allowed(msg.thread, user):
        return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

    if msg.sender_id != user.id:
        return Response(
            {"detail": "You can only update your own message"},
            status=status.HTTP_403_FORBIDDEN
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
            "detail": "Message updated successfully",
            "message": RoommateChatMessageSerializer(msg, context={"request": request}).data,
        },
        status=status.HTTP_200_OK
    )


# =========================
# DELETE ROOMMATE MESSAGE
# DELETE /api/tenant/roommates/messages/<message_id>/delete/
# =========================
@api_view(["DELETE"])
@permission_classes([IsAuthenticated, IsTenantRole])
def roommate_delete_message(request, message_id: int):
    user = request.user

    try:
        msg = RoommateChatMessage.objects.select_related("thread", "sender").get(id=message_id)
    except RoommateChatMessage.DoesNotExist:
        return Response({"detail": "Message not found"}, status=status.HTTP_404_NOT_FOUND)

    if not _allowed(msg.thread, user):
        return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

    if msg.sender_id != user.id:
        return Response(
            {"detail": "You can only delete your own message"},
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
            {"detail": "Message deleted successfully"},
            status=status.HTTP_200_OK
        )

    # hard delete
    if hasattr(msg, "image") and msg.image:
        try:
            msg.image.delete(save=False)
        except Exception:
            pass

    msg.delete()
    return Response(
        {"detail": "Message deleted successfully"},
        status=status.HTTP_200_OK
    )