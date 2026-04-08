from rest_framework import generics, permissions, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

from ..models import TenantRoomImageSave
from ..serializers import TenantRoomImageSaveSerializer


class TenantRoomImageSaveListCreateView(generics.ListCreateAPIView):
    serializer_class = TenantRoomImageSaveSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return TenantRoomImageSave.objects.filter(
            tenant=self.request.user
        ).order_by("-created_at")

    def create(self, request, *args, **kwargs):
        image = request.FILES.get("image")
        image_name = request.data.get("image_name", "").strip()
        layout_data = request.data.get("layout_data", "")

        if not image:
            return Response(
                {"detail": "Image is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not image_name:
            image_name = image.name

        room_image = TenantRoomImageSave.objects.create(
            tenant=request.user,
            image=image,
            image_name=image_name,
            layout_data=layout_data if layout_data else None,
        )

        serializer = self.get_serializer(room_image)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class TenantRoomImageSaveRetrieveUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TenantRoomImageSaveSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return TenantRoomImageSave.objects.filter(
            tenant=self.request.user
        ).order_by("-created_at")

    def update(self, request, *args, **kwargs):
        instance = self.get_object()

        image = request.FILES.get("image", None)
        image_name = request.data.get("image_name", None)
        layout_data = request.data.get("layout_data", None)

        # update image
        if image:
            instance.image = image
            if not image_name or not image_name.strip():
                instance.image_name = image.name

        # update image name
        if image_name and image_name.strip():
            instance.image_name = image_name.strip()

        # update layout data
        if layout_data is not None:
            instance.layout_data = layout_data if layout_data else None

        instance.save()

        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        # delete file from storage
        if instance.image:
            instance.image.delete(save=False)

        instance.delete()

        return Response(
            {"detail": "Room image deleted successfully"},
            status=status.HTTP_200_OK,
        )