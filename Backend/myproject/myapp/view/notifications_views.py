from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import Notification, Reminder
from ..serializers import NotificationSerializer, ReminderSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_notifications(request):
    qs = Notification.objects.filter(user=request.user).order_by("-created_at")[:50]
    return Response(NotificationSerializer(qs, many=True).data)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notif_id):
    try:
        n = Notification.objects.get(id=notif_id, user=request.user)
    except Notification.DoesNotExist:
        return Response({"detail": "Not found."}, status=404)

    n.is_read = True
    n.save(update_fields=["is_read"])
    return Response({"ok": True})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_reminder(request):
    serializer = ReminderSerializer(data=request.data)
    if serializer.is_valid():
        obj = serializer.save(user=request.user)
        return Response(ReminderSerializer(obj).data, status=201)
    return Response(serializer.errors, status=400)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_reminders(request):
    qs = Reminder.objects.filter(user=request.user).order_by("due_date")
    return Response(ReminderSerializer(qs, many=True).data)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_reminder(request, reminder_id):
    try:
        r = Reminder.objects.get(id=reminder_id, user=request.user)
    except Reminder.DoesNotExist:
        return Response({"detail": "Not found."}, status=404)

    serializer = ReminderSerializer(r, data=request.data, partial=True)
    if serializer.is_valid():
        obj = serializer.save()
        return Response(ReminderSerializer(obj).data)
    return Response(serializer.errors, status=400)
