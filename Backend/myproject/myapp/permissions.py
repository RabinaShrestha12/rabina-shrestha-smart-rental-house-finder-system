from rest_framework.permissions import BasePermission


class IsOwnerRole(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and getattr(user, "role", None) == "owner"
        )


class IsTenantRole(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and getattr(user, "role", None) == "tenant"
        )


class IsProviderRole(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and getattr(user, "role", None) == "provider"
        )


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and getattr(user, "role", None) == "admin"
        )


class HasAcceptedPlatformAgreement(BasePermission):
    """
    Allows access only to owners who have accepted the platform agreement.
    """
    message = "You must accept the platform agreement before adding a property."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if getattr(user, "role", None) != "owner":
            return False

        # Avoid circular import
        from .models import OwnerPlatformAgreement
        agreement = OwnerPlatformAgreement.objects.filter(owner=user).first()
        return agreement is not None and agreement.status == "accepted"