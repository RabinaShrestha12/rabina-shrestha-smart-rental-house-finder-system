# myapp/serializers.py
from __future__ import annotations

from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from PIL import Image, ImageOps
from rest_framework import serializers

from .models import Owner, Tenant, Listing, BookingRequest, BookingMessage

User = get_user_model()


# =========================
# USER SERIALIZER
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


# =========================
# OWNER / TENANT SERIALIZERS (linked tables)
# =========================
class OwnerSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True, default=None)
    email = serializers.EmailField(source="user.email", read_only=True, default=None)

    class Meta:
        model = Owner
        fields = [
            "id",
            "user_id",
            "username",
            "email",
            "address",
            "phone",
            "location",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user_id", "username", "email", "created_at", "updated_at"]


class TenantSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True, default=None)
    email = serializers.EmailField(source="user.email", read_only=True, default=None)

    class Meta:
        model = Tenant
        fields = [
            "id",
            "user_id",
            "username",
            "email",
            "address",
            "phone",
            "location",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user_id", "username", "email", "created_at", "updated_at"]


# =========================
# LISTING SERIALIZER (+360 + owner info)
# =========================
class ListingSerializer(serializers.ModelSerializer):
    # owner info for frontend display
    owner_name = serializers.CharField(source="owner.username", read_only=True)
    owner_email = serializers.EmailField(source="owner.email", read_only=True)

    # Absolute URLs
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
    # Optional: normalize uploads
    # -------------------------
    def _make_square(self, uploaded_file, size=1024):
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
        if validated_data.get("image"):
            validated_data["image"] = self._make_square(validated_data["image"], 1024)

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
            "owner_name",
            "owner_email",
            "title",
            "description",
            "property_type",
            "price_per_month",
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
        read_only_fields = ["id", "owner", "created_at", "owner_name", "owner_email"]


# =========================
# OPTION 1: Booking + Messages
# =========================
class BookingRequestCreateSerializer(serializers.Serializer):
    listing_id = serializers.IntegerField()
    first_message = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        user = self.context["request"].user

        if not user.is_authenticated:
            raise serializers.ValidationError("Login required.")
        if getattr(user, "role", "") != "tenant":
            raise serializers.ValidationError("Only TENANT can request booking.")

        try:
            listing = Listing.objects.get(id=attrs["listing_id"])
        except Listing.DoesNotExist:
            raise serializers.ValidationError("Listing not found.")

        if listing.status == "booked" or listing.is_available is False:
            raise serializers.ValidationError("Listing already booked.")

        if listing.owner_id == user.id:
            raise serializers.ValidationError("You cannot book your own listing.")

        attrs["listing"] = listing
        return attrs

    def create(self, validated_data):
        tenant = self.context["request"].user
        listing = validated_data["listing"]
        first_text = (validated_data.get("first_message") or "").strip()

        booking, _ = BookingRequest.objects.get_or_create(
            listing=listing,
            tenant=tenant,
            defaults={"status": BookingRequest.STATUS_PENDING},
        )

        if first_text:
            BookingMessage.objects.create(request=booking, sender=tenant, text=first_text)

        return booking


class BookingMessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source="sender.username", read_only=True)
    sender_role = serializers.CharField(source="sender.role", read_only=True)

    class Meta:
        model = BookingMessage
        fields = [
            "id",
            "request",
            "sender",
            "sender_username",
            "sender_role",
            "text",
            "created_at",
            "is_read",
        ]
        # ✅ do NOT allow client to set request/sender directly
        read_only_fields = ["id", "request", "sender", "created_at", "is_read"]


class BookingRequestListSerializer(serializers.ModelSerializer):
    listing = ListingSerializer(read_only=True)

    tenant_name = serializers.CharField(source="tenant.username", read_only=True)
    tenant_email = serializers.EmailField(source="tenant.email", read_only=True)

    owner_name = serializers.CharField(source="listing.owner.username", read_only=True)
    owner_email = serializers.EmailField(source="listing.owner.email", read_only=True)

    last_message = serializers.SerializerMethodField()

    class Meta:
        model = BookingRequest
        fields = [
            "id",
            "listing",
            "tenant",
            "tenant_name",
            "tenant_email",
            "owner_name",
            "owner_email",
            "status",
            "created_at",
            "decided_at",
            "last_message",
        ]

    def get_last_message(self, obj):
        m = obj.messages.order_by("-created_at").first()
        if not m:
            return None
        return {
            "text": m.text[:120],
            "created_at": m.created_at,
            "sender": m.sender.username,
        }
