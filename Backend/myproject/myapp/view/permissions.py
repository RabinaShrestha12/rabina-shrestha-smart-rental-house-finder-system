from rest_framework.permissions import BasePermission


class IsOwnerRole(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and getattr(request.user, "role", "") == "owner"


class IsTenantRole(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and getattr(request.user, "role", "") == "tenant"


class IsOwnerOfBookingListing(BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user.is_authenticated and obj.listing.owner_id == request.user.id
