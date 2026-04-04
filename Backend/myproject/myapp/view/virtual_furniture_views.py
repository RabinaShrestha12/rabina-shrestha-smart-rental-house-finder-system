from rest_framework import generics, permissions, status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import VirtualFurnitureDesign, Tenant
from ..serializers import (
    VirtualFurnitureDesignSerializer,
    VirtualFurnitureDesignCreateUpdateSerializer,
)


def resolve_tenant_for_design(request):
    """
    Returns the correct tenant value for VirtualFurnitureDesign. 
    It supports both cases:
    1. tenant field points to AUTH_USER_MODEL
    2. tenant field points to Tenant model
    """
    tenant_field_model = VirtualFurnitureDesign._meta.get_field("tenant").remote_field.model

    # Case 1: tenant = ForeignKey(settings.AUTH_USER_MODEL)
    if tenant_field_model == request.user.__class__:
        return request.user

    # Case 2: tenant = ForeignKey(Tenant)
    if tenant_field_model == Tenant:
        tenant_obj = Tenant.objects.filter(user=request.user).first()
        if not tenant_obj:
            raise ValueError("Tenant profile not found for this user.")
        return tenant_obj

    raise ValueError("Unsupported tenant relation in VirtualFurnitureDesign model.")


class VirtualFurnitureDesignListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        try:
            tenant_obj = resolve_tenant_for_design(self.request)
            return VirtualFurnitureDesign.objects.filter(tenant=tenant_obj).order_by("-updated_at")
        except Exception as e:
            print("LIST QUERY ERROR:", str(e))
            return VirtualFurnitureDesign.objects.none()

    def get_serializer_class(self):
        if self.request.method == "POST":
            return VirtualFurnitureDesignCreateUpdateSerializer
        return VirtualFurnitureDesignSerializer

    def perform_create(self, serializer):
        tenant_obj = resolve_tenant_for_design(self.request)
        serializer.save(tenant=tenant_obj)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})

        if not serializer.is_valid():
            print("LIST CREATE SAVE DESIGN ERRORS:", serializer.errors)
            return Response(
                {
                    "message": "Failed to save furniture design.",
                    "errors": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            tenant_obj = resolve_tenant_for_design(request)
            design = serializer.save(tenant=tenant_obj)
            output = VirtualFurnitureDesignSerializer(design, context={"request": request})
            return Response(output.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            print("LIST CREATE EXCEPTION:", str(e))
            return Response(
                {
                    "message": "Something went wrong while saving furniture design.",
                    "detail": str(e),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    def get_serializer_context(self):
        return {"request": self.request}


class VirtualFurnitureDesignDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        try:
            tenant_obj = resolve_tenant_for_design(self.request)
            return VirtualFurnitureDesign.objects.filter(tenant=tenant_obj).order_by("-updated_at")
        except Exception as e:
            print("DETAIL QUERY ERROR:", str(e))
            return VirtualFurnitureDesign.objects.none()

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return VirtualFurnitureDesignCreateUpdateSerializer
        return VirtualFurnitureDesignSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()

        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=partial,
            context={"request": request},
        )

        if not serializer.is_valid():
            print("UPDATE DESIGN ERRORS:", serializer.errors)
            return Response(
                {
                    "message": "Failed to update furniture design.",
                    "errors": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            tenant_obj = resolve_tenant_for_design(request)
            design = serializer.save(tenant=tenant_obj)
            output = VirtualFurnitureDesignSerializer(design, context={"request": request})
            return Response(output.data, status=status.HTTP_200_OK)
        except Exception as e:
            print("UPDATE DESIGN EXCEPTION:", str(e))
            return Response(
                {
                    "message": "Something went wrong while updating furniture design.",
                    "detail": str(e),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            instance.delete()
            return Response(
                {"message": "Furniture design deleted successfully."},
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            print("DELETE DESIGN EXCEPTION:", str(e))
            return Response(
                {
                    "message": "Failed to delete furniture design.",
                    "detail": str(e),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    def get_serializer_context(self):
        return {"request": self.request}


class VirtualFurnitureDesignQuickSaveView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, *args, **kwargs):
        serializer = VirtualFurnitureDesignCreateUpdateSerializer(
            data=request.data,
            context={"request": request},
        )

        if not serializer.is_valid():
            print("QUICK SAVE DESIGN ERRORS:", serializer.errors)
            return Response(
                {
                    "message": "Failed to save furniture design.",
                    "errors": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            tenant_obj = resolve_tenant_for_design(request)
            design = serializer.save(tenant=tenant_obj)

            output = VirtualFurnitureDesignSerializer(
                design,
                context={"request": request},
            )
            return Response(output.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            print("QUICK SAVE DESIGN EXCEPTION:", str(e))
            return Response(
                {
                    "message": "Something went wrong while saving furniture design.",
                    "detail": str(e),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )