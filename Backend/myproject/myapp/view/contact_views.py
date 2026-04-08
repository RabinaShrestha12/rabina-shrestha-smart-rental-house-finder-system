from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..models import ContactMessage
from ..serializers import ContactMessageSerializer


@api_view(["POST"])
@permission_classes([AllowAny])
def public_contact_create(request):
    serializer = ContactMessageSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(
            {
                "detail": "Contact message submitted successfully.",
                "data": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_contact_messages(request):
    if getattr(request.user, "role", "") != "admin":
        return Response(
            {"detail": "You do not have permission to view contact messages."},
            status=status.HTTP_403_FORBIDDEN,
        )

    messages = ContactMessage.objects.all().order_by("-created_at")
    serializer = ContactMessageSerializer(messages, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)