# myapp/view/public/owner_views.py
from rest_framework import generics, status
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from ...models import Listing, PropertyGalleryImage
from ...serializers import ListingSerializer
from ...permissions import IsOwnerRole, HasAcceptedPlatformAgreement


class OwnerCreateListingView(generics.CreateAPIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsOwnerRole, HasAcceptedPlatformAgreement]
    serializer_class = ListingSerializer
    parser_classes = [MultiPartParser, FormParser]
    queryset = Listing.objects.all()

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user, is_available=True)

    def create(self, request, *args, **kwargs):
        print("==== CREATE LISTING DEBUG START ====")
        print("USER:", request.user, "ROLE:", getattr(request.user, "role", None))
        print("DATA KEYS:", list(request.data.keys()))
        print("FILES KEYS:", list(request.FILES.keys()))
        print("==== CREATE LISTING DEBUG END ====")

        serializer = self.get_serializer(data=request.data, context={"request": request})

        if not serializer.is_valid():
            # ✅ PRINT EXACT REASON IN TERMINAL
            print("==== SERIALIZER ERRORS ====")
            print(serializer.errors)
            print("==== END ERRORS ====")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        self.perform_create(serializer)
        listing = serializer.instance

        # ✅ SAVE GALLERY IMAGES
        gallery_files = request.FILES.getlist("gallery_images")
        for image_file in gallery_files:
            PropertyGalleryImage.objects.create(
                listing=listing,
                image=image_file,
            )

        return Response(serializer.data, status=status.HTTP_201_CREATED)
