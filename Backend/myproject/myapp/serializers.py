# myapp/serializers.py

from __future__ import annotations

from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from PIL import Image, ImageOps
from rest_framework import serializers

from .models import (
    OwnerProfile,
    TenantProfile,
    Listing,
    BookingRequest,
)

User = get_user_model()


# =========================
# USER SERIALIZERS
# =========================
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "address",
            "phone",
            "is_email_verified",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class OwnerProfileSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = OwnerProfile
        fields = ["id", "user", "address", "phone", "location", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class TenantProfileSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = TenantProfile
        fields = ["id", "user", "location", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


# =========================
# LISTING SERIALIZER (+360)
# =========================
class ListingSerializer(serializers.ModelSerializer):
    # Absolute URLs for frontend
    image_url = serializers.SerializerMethodField()
    pano_url = serializers.SerializerMethodField()

    pano_front_url = serializers.SerializerMethodField()
    pano_back_url = serializers.SerializerMethodField()
    pano_left_url = serializers.SerializerMethodField()
    pano_right_url = serializers.SerializerMethodField()
    pano_up_url = serializers.SerializerMethodField()
    pano_down_url = serializers.SerializerMethodField()

    cubemap = serializers.SerializerMethodField()
    view_360_type = serializers.SerializerMethodField()
    has_360 = serializers.SerializerMethodField()

    # -------------------------
    # URL helpers
    # -------------------------
    def _abs(self, request, filefield):
        if not filefield:
            return None
        try:
            url = filefield.url
        except Exception:
            return None
        return request.build_absolute_uri(url) if request else url

    def get_image_url(self, obj):
        request = self.context.get("request")
        return self._abs(request, obj.image)

    def get_pano_url(self, obj):
        request = self.context.get("request")
        return self._abs(request, obj.pano_360)

    def get_pano_front_url(self, obj):
        request = self.context.get("request")
        return self._abs(request, obj.pano_front)

    def get_pano_back_url(self, obj):
        request = self.context.get("request")
        return self._abs(request, obj.pano_back)

    def get_pano_left_url(self, obj):
        request = self.context.get("request")
        return self._abs(request, obj.pano_left)

    def get_pano_right_url(self, obj):
        request = self.context.get("request")
        return self._abs(request, obj.pano_right)

    def get_pano_up_url(self, obj):
        request = self.context.get("request")
        return self._abs(request, obj.pano_up)

    def get_pano_down_url(self, obj):
        request = self.context.get("request")
        return self._abs(request, obj.pano_down)

    # -------------------------
    # 360 helpers
    # -------------------------
    def _has_cubemap(self, obj):
        return all(
            [
                bool(obj.pano_front),
                bool(obj.pano_back),
                bool(obj.pano_left),
                bool(obj.pano_right),
                bool(obj.pano_up),
                bool(obj.pano_down),
            ]
        )

    def get_cubemap(self, obj):
        request = self.context.get("request")
        return {
            "front": self._abs(request, obj.pano_front),
            "back": self._abs(request, obj.pano_back),
            "left": self._abs(request, obj.pano_left),
            "right": self._abs(request, obj.pano_right),
            "up": self._abs(request, obj.pano_up),
            "down": self._abs(request, obj.pano_down),
        }

    def get_view_360_type(self, obj):
        if getattr(obj, "pano_360", None):
            return "equirect"
        if self._has_cubemap(obj):
            return "cubemap"
        return "none"

    def get_has_360(self, obj):
        return bool(getattr(obj, "pano_360", None)) or self._has_cubemap(obj)

    # -------------------------
    # OPTIONAL: normalize uploads
    # -------------------------
    def _make_square(self, uploaded_file, size=1024):
        """
        Optional: crops to square for consistency
        (Use if your cubemap faces are inconsistent sizes)
        """
        if not uploaded_file:
            return None

        img = Image.open(uploaded_file)
        img = ImageOps.exif_transpose(img)
        img = img.convert("RGB")

        w, h = img.size
        side = min(w, h)
        left = (w - side) // 2
        top = (h - side) // 2
        img = img.crop((left, top, left + side, top + side))
        img = img.resize((size, size), Image.LANCZOS)

        buffer = BytesIO()
        img.save(buffer, format="JPEG", quality=90, optimize=True)
        return ContentFile(buffer.getvalue(), name=uploaded_file.name)

    def _normalize_uploads(self, validated_data):
        # main image
        if validated_data.get("image"):
            validated_data["image"] = self._make_square(validated_data["image"], 1024)

        # cubemap faces
        face_fields = ["pano_front", "pano_back", "pano_left", "pano_right", "pano_up", "pano_down"]
        for f in face_fields:
            if validated_data.get(f):
                validated_data[f] = self._make_square(validated_data[f], 1024)

        return validated_data

    def create(self, validated_data):
        validated_data = self._normalize_uploads(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data = self._normalize_uploads(validated_data)
        return super().update(instance, validated_data)

    class Meta:
        model = Listing
        fields = [
            "id",
            "owner",
            "title",
            "description",
            "property_type",
            "price_per_week",
            "location",
            "electricity_bill",
            "owner_contact_number",
            "owner_contact_email",
            "image",
            "pano_360",
            "pano_front",
            "pano_back",
            "pano_left",
            "pano_right",
            "pano_up",
            "pano_down",
            "image_url",
            "pano_url",
            "pano_front_url",
            "pano_back_url",
            "pano_left_url",
            "pano_right_url",
            "pano_up_url",
            "pano_down_url",
            "cubemap",
            "view_360_type",
            "has_360",
            "is_available",
            "status",
            "created_at",
        ]
        read_only_fields = ["id", "owner", "created_at"]


# =========================
# BOOKING SERIALIZERS
# =========================
class TenantBookingCreateSerializer(serializers.Serializer):
    listing_id = serializers.IntegerField()
    message = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user

        if not user.is_authenticated:
            raise serializers.ValidationError("Login required.")

        if getattr(user, "role", "") != "tenant":
            raise serializers.ValidationError("Only TENANT can request booking.")

        listing_id = attrs["listing_id"]
        try:
            listing = Listing.objects.get(id=listing_id)
        except Listing.DoesNotExist:
            raise serializers.ValidationError("Listing not found.")

        if listing.is_available is False or listing.status == "booked":
            raise serializers.ValidationError("This listing is already booked.")

        # NOTE: If Listing.owner is a FK to User:
        # listing.owner_id is User.id, so this check is okay
        if listing.owner_id == user.id:
            raise serializers.ValidationError("Owner cannot request booking for own listing.")

        attrs["listing"] = listing
        return attrs

    def create(self, validated_data):
        tenant = self.context["request"].user
        listing = validated_data["listing"]
        message = validated_data.get("message", "")

        obj, _ = BookingRequest.objects.update_or_create(
            listing=listing,
            tenant=tenant,
            defaults={
                "message": message,
                "status": BookingRequest.STATUS_PENDING,
                "decided_at": None,
            },
        )
        return obj


class TenantBookingListSerializer(serializers.ModelSerializer):
    listing = ListingSerializer(read_only=True)

    class Meta:
        model = BookingRequest
        fields = ["id", "listing", "message", "status", "created_at", "decided_at"]


class OwnerBookingListSerializer(serializers.ModelSerializer):
    listing = ListingSerializer(read_only=True)
    tenant_email = serializers.EmailField(source="tenant.email", read_only=True)
    tenant_name = serializers.CharField(source="tenant.username", read_only=True)

    class Meta:
        model = BookingRequest
        fields = [
            "id",
            "listing",
            "tenant_name",
            "tenant_email",
            "message",
            "status",
            "created_at",
            "decided_at",
        ]
