from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from myapp.models import RentalContract
from myapp.serializers import (
    RentalContractCreateSerializer,
    RentalContractListSerializer,
    RentalContractDetailSerializer,
    RentalContractOwnerUpdateSerializer,
)


def _get_user_display_name(user):
    try:
        full_name = user.get_full_name()
        if full_name:
            return full_name
    except Exception:
        pass

    for attr in ["full_name", "name", "username", "email"]:
        value = getattr(user, attr, "")
        if value:
            return str(value)

    return "User"


def _get_listing_title(listing):
    return (
        getattr(listing, "title", None)
        or getattr(listing, "property_name", None)
        or getattr(listing, "name", None)
        or f"Listing #{listing.id}"
    )


def _get_listing_address(listing):
    return (
        getattr(listing, "address", None)
        or getattr(listing, "location", None)
        or getattr(listing, "city", None)
        or "N/A"
    )


def build_contract_text(contract):
    owner_name = _get_user_display_name(contract.owner)
    tenant_name = _get_user_display_name(contract.tenant)
    listing_title = _get_listing_title(contract.listing)
    listing_address = _get_listing_address(contract.listing)

    start_date = contract.start_date.isoformat() if contract.start_date else "Not set"
    end_date = contract.end_date.isoformat() if contract.end_date else "Not set"

    return f"""
RENTAL AGREEMENT

Contract Title:
{contract.contract_title or f"Rental Contract - {listing_title}"}

OWNER DETAILS
Name: {owner_name}

TENANT DETAILS
Name: {tenant_name}

PROPERTY DETAILS
Property: {listing_title}
Address: {listing_address}

RENTAL TERMS
Monthly Rent: {contract.rent_amount}
Security Deposit: {contract.security_deposit}
Payment Due Day: {contract.payment_due_day}
Start Date: {start_date}
End Date: {end_date}

UTILITY TERMS
{contract.utility_terms or "Utilities will be handled as agreed by both parties."}

HOUSE RULES
{contract.house_rules or "Tenant must maintain cleanliness, avoid damage, respect neighbours, and follow property rules."}

SPECIAL TERMS
{contract.special_terms or "No additional special terms."}

SIGNING STATUS
Owner Signed: {"Yes" if contract.owner_signed else "No"}
Tenant Signed: {"Yes" if contract.tenant_signed else "No"}

This agreement is digitally managed through the Smart Rental House Finder platform.
""".strip()


def is_owner(user):
    return str(getattr(user, "role", "")).lower() == "owner"


def is_tenant(user):
    return str(getattr(user, "role", "")).lower() == "tenant"


class OwnerContractListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not is_owner(request.user):
            return Response(
                {"detail": "Only OWNER can view contracts."},
                status=status.HTTP_403_FORBIDDEN,
            )

        contracts = (
            RentalContract.objects.filter(owner=request.user)
            .select_related("listing", "owner", "tenant", "booking")
            .order_by("-updated_at", "-created_at")
        )
        serializer = RentalContractListSerializer(contracts, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        if not is_owner(request.user):
            return Response(
                {"detail": "Only OWNER can create contracts."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = RentalContractCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        contract = serializer.save()

        contract.generated_text = build_contract_text(contract)
        contract.save(update_fields=["generated_text", "updated_at"])

        return Response(
            RentalContractDetailSerializer(contract).data,
            status=status.HTTP_201_CREATED,
        )


class OwnerContractDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, request, pk):
        return get_object_or_404(
            RentalContract.objects.select_related("listing", "owner", "tenant", "booking"),
            pk=pk,
            owner=request.user,
        )

    def get(self, request, pk):
        if not is_owner(request.user):
            return Response(
                {"detail": "Only OWNER can view contract details."},
                status=status.HTTP_403_FORBIDDEN,
            )

        contract = self.get_object(request, pk)
        contract.generated_text = build_contract_text(contract)
        contract.save(update_fields=["generated_text", "updated_at"])

        serializer = RentalContractDetailSerializer(contract)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        if not is_owner(request.user):
            return Response(
                {"detail": "Only OWNER can update contracts."},
                status=status.HTTP_403_FORBIDDEN,
            )

        contract = self.get_object(request, pk)

        if contract.status not in ["draft", "pending_tenant", "active"]:
            return Response(
                {"detail": "This contract cannot be edited in its current status."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = RentalContractOwnerUpdateSerializer(
            contract, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        contract.generated_text = build_contract_text(contract)
        contract.save(update_fields=["generated_text", "updated_at"])

        return Response(
            RentalContractDetailSerializer(contract).data,
            status=status.HTTP_200_OK,
        )

    def delete(self, request, pk):
        if not is_owner(request.user):
            return Response(
                {"detail": "Only OWNER can delete contracts."},
                status=status.HTTP_403_FORBIDDEN,
            )

        contract = self.get_object(request, pk)

        if contract.status == "active":
            return Response(
                {"detail": "Active contracts cannot be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        contract.delete()
        return Response(
            {"detail": "Contract deleted successfully."},
            status=status.HTTP_200_OK,
        )


class OwnerSendContractView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if not is_owner(request.user):
            return Response(
                {"detail": "Only OWNER can send contracts."},
                status=status.HTTP_403_FORBIDDEN,
            )

        contract = get_object_or_404(
            RentalContract.objects.select_related("listing", "owner", "tenant"),
            pk=pk,
            owner=request.user,
        )

        if contract.status != "draft":
            return Response(
                {"detail": "Only draft contracts can be sent to tenant."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not contract.start_date or not contract.end_date:
            return Response(
                {"detail": "Please fill start date and end date before sending."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        contract.generated_text = build_contract_text(contract)
        contract.status = "pending_tenant"
        contract.save(update_fields=["generated_text", "status", "updated_at"])

        return Response(
            {"detail": "Contract sent to tenant successfully."},
            status=status.HTTP_200_OK,
        )


class OwnerFinalizeContractView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if not is_owner(request.user):
            return Response(
                {"detail": "Only OWNER can finalize contracts."},
                status=status.HTTP_403_FORBIDDEN,
            )

        contract = get_object_or_404(
            RentalContract.objects.select_related("listing", "owner", "tenant"),
            pk=pk,
            owner=request.user,
        )

        if contract.status != "pending_owner":
            return Response(
                {"detail": "Contract is not ready for owner finalization."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not contract.tenant_signed:
            return Response(
                {"detail": "Tenant must accept the contract first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        contract.owner_signed = True
        contract.owner_signed_at = timezone.now()
        contract.status = "active"
        contract.generated_text = build_contract_text(contract)
        contract.save()

        return Response(
            {"detail": "Contract finalized successfully."},
            status=status.HTTP_200_OK,
        )


class TenantContractListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not is_tenant(request.user):
            return Response(
                {"detail": "Only TENANT can view contracts."},
                status=status.HTTP_403_FORBIDDEN,
            )

        contracts = (
            RentalContract.objects.filter(tenant=request.user)
            .select_related("listing", "owner", "tenant", "booking")
            .order_by("-updated_at", "-created_at")
        )
        serializer = RentalContractListSerializer(contracts, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class TenantContractDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        if not is_tenant(request.user):
            return Response(
                {"detail": "Only TENANT can view contract details."},
                status=status.HTTP_403_FORBIDDEN,
            )

        contract = get_object_or_404(
            RentalContract.objects.select_related("listing", "owner", "tenant", "booking"),
            pk=pk,
            tenant=request.user,
        )

        contract.generated_text = build_contract_text(contract)
        contract.save(update_fields=["generated_text", "updated_at"])

        serializer = RentalContractDetailSerializer(contract)
        return Response(serializer.data, status=status.HTTP_200_OK)


class TenantRespondContractView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if not is_tenant(request.user):
            return Response(
                {"detail": "Only TENANT can respond to contracts."},
                status=status.HTTP_403_FORBIDDEN,
            )

        contract = get_object_or_404(
            RentalContract.objects.select_related("listing", "owner", "tenant"),
            pk=pk,
            tenant=request.user,
        )

        action = str(request.data.get("action", "")).strip().lower()

        if contract.status != "pending_tenant":
            return Response(
                {"detail": "This contract is not waiting for tenant response."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if action == "accept":
            contract.tenant_signed = True
            contract.tenant_signed_at = timezone.now()
            contract.status = "pending_owner"
            contract.generated_text = build_contract_text(contract)
            contract.save()

            return Response(
                {"detail": "Contract accepted successfully."},
                status=status.HTTP_200_OK,
            )

        if action == "reject":
            contract.status = "rejected"
            contract.generated_text = build_contract_text(contract)
            contract.save(update_fields=["status", "generated_text", "updated_at"])

            return Response(
                {"detail": "Contract rejected."},
                status=status.HTTP_200_OK,
            )

        return Response(
            {"detail": "Invalid action. Use 'accept' or 'reject'."},
            status=status.HTTP_400_BAD_REQUEST,
        )