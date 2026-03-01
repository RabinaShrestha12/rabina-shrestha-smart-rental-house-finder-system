# myapp/view/roommate_chat_views.py

from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

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
    This fixes older accepted requests that were accepted before thread creation code existed.
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
            defaults={"title": f"{req.from_user.username} & {req.to_user.username}"},
        )
        if created:
            created_ids.append(thread.id)

    return created_ids


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

    # ✅ auto-sync before returning (so chats always appear)
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
    except Exception:
        return Response({"detail": "Thread not found"}, status=status.HTTP_404_NOT_FOUND)

    if not _allowed(thread, user):
        return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

    msgs = RoommateChatMessage.objects.filter(thread=thread).order_by("created_at")
    ser = RoommateChatMessageSerializer(msgs, many=True)
    return Response({"thread_id": thread.id, "results": ser.data}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsTenantRole])
def roommate_send_message(request, thread_id: int):
    user = request.user
    text = (request.data.get("text") or "").strip()

    if not text:
        return Response({"detail": "text is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        thread = RoommateChatThread.objects.get(id=thread_id)
    except Exception:
        return Response({"detail": "Thread not found"}, status=status.HTTP_404_NOT_FOUND)

    if not _allowed(thread, user):
        return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

    msg = RoommateChatMessage.objects.create(thread=thread, sender=user, text=text)
    return Response(RoommateChatMessageSerializer(msg).data, status=status.HTTP_201_CREATED)