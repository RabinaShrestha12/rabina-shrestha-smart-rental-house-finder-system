from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from myapp.models import Notification


def notif_to_dict(n):
    created_at = getattr(n, "created_at", None)

    return {
        "id": n.id,
        "title": getattr(n, "title", "") or "Notification",
        "message": getattr(n, "message", "") or "",
        "link": getattr(n, "link", "") or "",
        "is_read": bool(getattr(n, "is_read", False)),
        "created_at": created_at.isoformat() if created_at else None,

        # optional extra fields for frontend
        "type": getattr(n, "type", "") or getattr(n, "category", "") or "",
        "sender_name": (
            getattr(getattr(n, "sender", None), "username", None)
            or getattr(n, "sender_name", "")
            or ""
        ),
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_notifications(request):
    """
    Return logged-in user's notifications.
    """
    qs = Notification.objects.filter(user=request.user).order_by("-created_at", "-id")
    return Response([notif_to_dict(n) for n in qs], status=status.HTTP_200_OK)


@api_view(["POST", "PATCH"])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notif_id):
    """
    Mark a notification as read.
    """
    try:
        notif = Notification.objects.get(id=notif_id, user=request.user)
    except Notification.DoesNotExist:
        return Response(
            {"detail": "Notification not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    notif.is_read = True
    notif.save(update_fields=["is_read"])

    return Response(
        {
            "ok": True,
            "notif_id": notif.id,
            "is_read": notif.is_read,
            "link": getattr(notif, "link", "") or "",
        },
        status=status.HTTP_200_OK,
    )


# -----------------------------
# REMINDERS
# keep placeholder for now if reminders are not your focus
# -----------------------------
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_reminder(request):
    data = request.data or {}
    return Response(
        {"ok": True, "message": "Reminder created (placeholder)", "data": data},
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_reminders(request):
    return Response([], status=status.HTTP_200_OK)


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_reminder(request, reminder_id):
    data = request.data or {}
    return Response(
        {"ok": True, "reminder_id": reminder_id, "updated": data},
        status=status.HTTP_200_OK,
    )