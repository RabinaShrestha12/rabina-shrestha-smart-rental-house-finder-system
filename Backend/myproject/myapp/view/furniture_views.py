from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

from myapp.models import FurnitureItem
from myapp.serializers import FurnitureItemSerializer


def is_admin(user):
    return str(getattr(user, "role", "")).lower() == "admin" or bool(getattr(user, "is_superuser", False))


@api_view(["GET"])
@permission_classes([AllowAny])
def furniture_list(request):
    qs = FurnitureItem.objects.filter(is_active=True).order_by("-id")
    serializer = FurnitureItemSerializer(qs, many=True, context={"request": request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def furniture_create(request):
    if not is_admin(request.user):
        return Response({"detail": "Only admin can add furniture."}, status=status.HTTP_403_FORBIDDEN)

    serializer = FurnitureItemSerializer(data=request.data, context={"request": request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["PATCH", "PUT"])
@permission_classes([IsAuthenticated])
def furniture_update(request, pk):
    if not is_admin(request.user):
        return Response({"detail": "Only admin can update furniture."}, status=status.HTTP_403_FORBIDDEN)

    try:
        item = FurnitureItem.objects.get(pk=pk)
    except FurnitureItem.DoesNotExist:
        return Response({"detail": "Furniture not found."}, status=status.HTTP_404_NOT_FOUND)

    serializer = FurnitureItemSerializer(
        item,
        data=request.data,
        partial=True,
        context={"request": request},
    )
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def furniture_delete(request, pk):
    if not is_admin(request.user):
        return Response({"detail": "Only admin can delete furniture."}, status=status.HTTP_403_FORBIDDEN)

    try:
        item = FurnitureItem.objects.get(pk=pk)
    except FurnitureItem.DoesNotExist:
        return Response({"detail": "Furniture not found."}, status=status.HTTP_404_NOT_FOUND)

    item.delete()
    return Response({"message": "Furniture deleted successfully."}, status=status.HTTP_200_OK)