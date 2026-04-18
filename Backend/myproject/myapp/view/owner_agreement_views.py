from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from ..models import OwnerPlatformAgreement
from ..serializers import OwnerPlatformAgreementSerializer
from ..permissions import IsOwnerRole


class OwnerPlatformAgreementView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerRole]

    def get_object(self, user):
        agreement, created = OwnerPlatformAgreement.objects.get_or_create(
            owner=user,
            defaults={
                "agreement_key": "property_listing_v1",
                "agreement_title": "Property Listing Agreement",
                "agreement_version": "v1",
            },
        )
        return agreement

    def get(self, request):
        agreement = self.get_object(request.user)
        serializer = OwnerPlatformAgreementSerializer(agreement)
        return Response(serializer.data, status=status.HTTP_200_OK)


class OwnerPlatformAgreementRespondView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerRole]

    def post(self, request):
        action = str(request.data.get("action", "")).strip().lower()

        if action not in ["accept", "reject"]:
            return Response(
                {"detail": "Invalid action. Use 'accept' or 'reject'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        agreement, created = OwnerPlatformAgreement.objects.get_or_create(
            owner=request.user,
            defaults={
                "agreement_key": "property_listing_v1",
                "agreement_title": "Property Listing Agreement",
                "agreement_version": "v1",
            },
        )

        if action == "accept":
            agreement.mark_accepted()
        else:
            agreement.mark_rejected()

        serializer = OwnerPlatformAgreementSerializer(agreement)
        return Response(serializer.data, status=status.HTTP_200_OK)