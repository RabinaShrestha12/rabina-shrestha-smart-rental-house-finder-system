from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status


# =========================
# NOTIFICATIONS (placeholder)
# =========================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_notifications(request):
    """
    Return logged-in user's notifications.
    Placeholder implementation so URLs work.
    """
    # Later: query Notification model here
    return Response([], status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notif_id):
    """
    Mark a notification as read (placeholder).
    """
    # Later: update Notification model row by notif_id and user
    return Response({"ok": True, "notif_id": notif_id}, status=status.HTTP_200_OK)


# =========================
# REMINDERS (placeholder)
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_reminder(request):
    """
    Create a reminder (placeholder).
    """
    data = request.data or {}
    # Later: create Reminder model row
    return Response(
        {"ok": True, "message": "Reminder created (placeholder)", "data": data},
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_reminders(request):
    """
    Return logged-in user's reminders (placeholder).
    """
    # Later: query Reminder model here
    return Response([], status=status.HTTP_200_OK)


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_reminder(request, reminder_id):
    """
    Update a reminder (placeholder).
    """
    data = request.data or {}
    # Later: update Reminder model row
    return Response(
        {"ok": True, "reminder_id": reminder_id, "updated": data},
        status=status.HTTP_200_OK,
    )
