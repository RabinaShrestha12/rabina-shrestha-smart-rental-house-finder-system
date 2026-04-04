from __future__ import annotations
from io import BytesIO
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from PIL import Image, ImageOps
from rest_framework import serializers
from django.db.models import Q
import json

from .models import (
    Owner,
    Tenant,
    ServiceProviderProfile,
    Listing,
    BookingRequest,
    BookingMessage,
    Review,
    MaintenanceRequest,
    ProviderMessage,
    Notification,
    Reminder,
    ListingFacility,
    RoommateProfile,
    RoommateRequest,
    RoommateChatMessage,
    RoommateChatThread,
    FurnitureItem,
    TenantExpense,
    VirtualFurnitureDesign,
)

User = get_user_model()


# USER SERIALIZER
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


# OWNER / TENANT SERIALIZERS (linked tables)
# NOTE: Owner/Tenant models now only have: user + location + created/updated
class OwnerSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True, default=None)
    email = serializers.EmailField(source="user.email", read_only=True, default=None)
    phone = serializers.CharField(source="user.phone", read_only=True, default="")
    address = serializers.CharField(source="user.address", read_only=True, default="")

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
        read_only_fields = ["id", "user_id", "username", "email", "address", "phone", "created_at", "updated_at"]


class TenantSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True, default=None)
    email = serializers.EmailField(source="user.email", read_only=True, default=None)
    phone = serializers.CharField(source="user.phone", read_only=True, default="")
    address = serializers.CharField(source="user.address", read_only=True, default="")

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
        read_only_fields = ["id", "user_id", "username", "email", "address", "phone", "created_at", "updated_at"]


# SERVICE PROVIDER PROFILE SERIALIZER
class ServiceProviderProfileSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True, default=None)
    email = serializers.EmailField(source="user.email", read_only=True, default=None)

    class Meta:
        model = ServiceProviderProfile
        fields = [
            "id",
            "user_id",
            "username",
            "email",
            "category",
            "service_area",
            "phone",
            "availability",
            "bio",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user_id", "username", "email", "created_at", "updated_at"]


# LISTING SERIALIZER (+360 + owner info + lat/lng + optional distance_km)
class ListingSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source="owner.username", read_only=True)
    owner_email = serializers.EmailField(source="owner.email", read_only=True, allow_blank=True)

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

    distance_km = serializers.SerializerMethodField()

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

    def get_distance_km(self, obj):
        val = getattr(obj, "distance_km", None)
        if val is None:
            return None
        try:
            return round(float(val), 2)
        except Exception:
            return None

    def validate_latitude(self, value):
        if value in ("", None):
            return value
        v = float(value)
        if v < -90 or v > 90:
            raise serializers.ValidationError("Latitude must be between -90 and 90.")
        return value

    def validate_longitude(self, value):
        if value in ("", None):
            return value
        v = float(value)
        if v < -180 or v > 180:
            raise serializers.ValidationError("Longitude must be between -180 and 180.")
        return value

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
            "latitude",
            "longitude",
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
            "distance_km",
            "is_available",
            "status",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "owner",
            "created_at",
            "owner_name",
            "owner_email",
            "distance_km",
        ]


# Booking + Messages
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
    sender_name = serializers.SerializerMethodField()
    sender_role = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = BookingMessage
        fields = [
            "id",
            "request",
            "sender",
            "sender_name",
            "sender_role",
            "text",
            "image",
            "image_url",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "sender",
            "sender_name",
            "sender_role",
            "image_url",
            "created_at",
        ]

    def get_sender_name(self, obj):
        return obj.sender.username if obj.sender else ""

    def get_sender_role(self, obj):
        return getattr(obj.sender, "role", "") if obj.sender else ""

    def get_image_url(self, obj):
        request = self.context.get("request")
        if obj.image:
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class ProviderMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_role = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProviderMessage
        fields = [
            "id",
            "maintenance_request",
            "sender",
            "sender_name",
            "sender_role",
            "text",
            "image",
            "image_url",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "sender",
            "sender_name",
            "sender_role",
            "image_url",
            "created_at",
        ]

    def get_sender_name(self, obj):
        return obj.sender.username if obj.sender else ""

    def get_sender_role(self, obj):
        return getattr(obj.sender, "role", "") if obj.sender else ""

    def get_image_url(self, obj):
        request = self.context.get("request")
        if obj.image:
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class RoommateChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_role = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = RoommateChatMessage
        fields = [
            "id",
            "thread",
            "sender",
            "sender_name",
            "sender_role",
            "text",
            "image",
            "image_url",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "sender",
            "sender_name",
            "sender_role",
            "image_url",
            "created_at",
        ]

    def get_sender_name(self, obj):
        return obj.sender.username if obj.sender else ""

    def get_sender_role(self, obj):
        return getattr(obj.sender, "role", "") if obj.sender else ""

    def get_image_url(self, obj):
        request = self.context.get("request")
        if obj.image:
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None
    
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


# Reviews
class ReviewSerializer(serializers.ModelSerializer):
    listing_title = serializers.CharField(source="listing.title", read_only=True)
    tenant_username = serializers.CharField(source="tenant.username", read_only=True)
    tenant_email = serializers.EmailField(source="tenant.email", read_only=True)
    owner_username = serializers.CharField(source="owner.username", read_only=True)

    class Meta:
        model = Review
        fields = [
            "id",
            "listing",
            "listing_title",
            "tenant",
            "tenant_username",
            "tenant_email",
            "owner",
            "owner_username",
            "rating",
            "comment",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "owner", "tenant"]


# ✅ Owner -> Provider Maintenance (listing optional)
class MaintenanceRequestSerializer(serializers.ModelSerializer):
    listing_title = serializers.CharField(source="listing.title", read_only=True, default=None)

    assigned_provider_profile_id = serializers.IntegerField(
        source="assigned_provider.id", read_only=True, default=None
    )
    assigned_provider_name = serializers.CharField(
        source="assigned_provider.user.username", read_only=True, default=None
    )

    owner_username = serializers.CharField(source="owner.username", read_only=True)
    owner_email = serializers.EmailField(source="owner.email", read_only=True)

    class Meta:
        model = MaintenanceRequest
        fields = [
            "id",
            "owner",
            "owner_username",
            "owner_email",
            "listing",
            "listing_title",
            "assigned_provider",
            "assigned_provider_profile_id",
            "assigned_provider_name",
            "category",
            "priority",
            "status",
            "title",
            "description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "owner", "owner_username", "owner_email"]



# =========================
# Notification / Reminder / Facilities
# =========================
class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = "__all__"
        read_only_fields = ["id", "created_at", "user"]


class ReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reminder
        fields = "__all__"
        read_only_fields = ["id", "created_at", "user"]


class ListingFacilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = ListingFacility
        fields = "__all__"
        read_only_fields = ["id"]


# =========================
# ✅ Roommate Finder Serializers
# =========================
class RoommateProfileSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = RoommateProfile
        fields = [
            "id", "user_id", "username", "email",
            "gender", "preferred_gender",
            "min_budget", "max_budget",
            "city", "preferred_area",
            "move_in_date", "stay_length_months",
            "smoker", "pets_ok", "tidy_level", "quiet_level",
            "bio", "is_active",
            "created_at", "updated_at"
        ]


# ✅ Roommate Chat Serializers

class RoommateChatThreadSerializer(serializers.ModelSerializer):
    other_user_id = serializers.SerializerMethodField()
    other_username = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()  # ✅ add this

    class Meta:
        model = RoommateChatThread
        fields = ["id", "created_at", "other_user_id", "other_username", "last_message"]

    def _other(self, obj):
        me = self.context["request"].user
        return obj.user2 if obj.user1_id == me.id else obj.user1

    def get_other_user_id(self, obj):
        return self._other(obj).id

    def get_other_username(self, obj):
        return self._other(obj).username

    def get_last_message(self, obj):
        m = obj.messages.order_by("-created_at").first()
        if not m:
            return None
        return {
            "text": m.text[:120],
            "created_at": m.created_at,
            "sender_id": m.sender_id,
            "sender_username": m.sender.username,
        }




class RoommateRequestSerializer(serializers.ModelSerializer):
    from_user_id = serializers.IntegerField(source="from_user.id", read_only=True)
    to_user_id = serializers.IntegerField(source="to_user.id", read_only=True)

    # ✅ these are what you will show on UI
    from_username = serializers.CharField(source="from_user.username", read_only=True)
    to_username = serializers.CharField(source="to_user.username", read_only=True)

    # ✅ for message button (works for multiple accepted tenants)
    thread_id = serializers.SerializerMethodField()

    class Meta:
        model = RoommateRequest
        fields = [
            "id",
            "from_user_id", "to_user_id",
            "from_username", "to_username",
            "message", "status",
            "created_at", "responded_at",
            "thread_id",
        ]
        read_only_fields = ["created_at", "responded_at", "thread_id"]

    def get_thread_id(self, obj):
        if obj.status != "accepted":
            return None
        a, b = obj.from_user_id, obj.to_user_id
        thread = RoommateChatThread.objects.filter(
            Q(user1_id=a, user2_id=b) | Q(user1_id=b, user2_id=a)
        ).first()
        return thread.id if thread else None
    
class FurnitureItemSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = FurnitureItem
        fields = [
            "id",
            "name",
            "category",
            "furniture_type",
            "color",
            "image",
            "image_url",
            "width",
            "height",
            "is_active",
            "created_at",
            "updated_at",
        ]

    def get_image_url(self, obj):
        request = self.context.get("request")
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url if obj.image else ""
    
from rest_framework import serializers
from .models import BookingPayment


class BookingPaymentSerializer(serializers.ModelSerializer):
    tenant_name = serializers.SerializerMethodField()
    tenant_email = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()
    owner_email = serializers.SerializerMethodField()
    listing_title = serializers.SerializerMethodField()

    class Meta:
        model = BookingPayment
        fields = [
            "id",
            "tenant",
            "tenant_name",
            "tenant_email",
            "owner",
            "owner_name",
            "owner_email",
            "listing",
            "listing_title",
            "amount",
            "admin_share_percent",
            "owner_share_percent",
            "admin_share_amount",
            "owner_share_amount",
            "is_first_property_payment",
            "transaction_uuid",
            "product_code",
            "ref_id",
            "payment_status",
            "owner_payout_status",
            "owner_payout_date",
            "owner_payout_note",
            "payment_month",
            "raw_response",
            "created_at",
            "verified_at",
        ]

    def get_tenant_name(self, obj):
        return (
            getattr(obj.tenant, "username", None)
            or getattr(obj.tenant, "email", None)
            or str(obj.tenant)
        )

    def get_tenant_email(self, obj):
        return getattr(obj.tenant, "email", None)

    def get_owner_name(self, obj):
        return (
            getattr(obj.owner, "username", None)
            or getattr(obj.owner, "email", None)
            or str(obj.owner)
        )

    def get_owner_email(self, obj):
        return getattr(obj.owner, "email", None)

    def get_listing_title(self, obj):
        return getattr(obj.listing, "title", f"Listing #{obj.listing_id}")
    


class TenantExpenseSerializer(serializers.ModelSerializer):
    month_label = serializers.SerializerMethodField()

    class Meta:
        model = TenantExpense
        fields = [
            "id",
            "title",
            "category",
            "amount",
            "date",
            "note",
            "month",
            "year",
            "month_label",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "month", "year", "month_label", "created_at", "updated_at"]

    def get_month_label(self, obj):
        import calendar
        return f"{calendar.month_abbr[obj.month]} {obj.year}"

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than 0.")
        return value

    def validate_title(self, value):
        if not value.strip():
            raise serializers.ValidationError("Title is required.")
        return value.strip()




class VirtualFurnitureDesignSerializer(serializers.ModelSerializer):
    room_image_url = serializers.SerializerMethodField()

    class Meta:
        model = VirtualFurnitureDesign
        fields = [
            "id",
            "title",
            "room_image",
            "room_image_url",
            "room_image_path",
            "placed_items",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "room_image_url", "created_at", "updated_at"]

    def get_room_image_url(self, obj):
        request = self.context.get("request")
        if obj.room_image:
            url = obj.room_image.url
            if request is not None:
                return request.build_absolute_uri(url)
            return url
        return ""

    def validate_placed_items(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("placed_items must be a list.")
        return value


class VirtualFurnitureDesignCreateUpdateSerializer(serializers.ModelSerializer):
    placed_items = serializers.JSONField(required=False)

    class Meta:
        model = VirtualFurnitureDesign
        fields = [
            "id",
            "title",
            "room_image",
            "room_image_path",
            "placed_items",
            "notes",
        ]
        read_only_fields = ["id"]

    def to_internal_value(self, data):
        mutable = data.copy()

        raw_placed_items = mutable.get("placed_items")

        if raw_placed_items in [None, ""]:
            mutable["placed_items"] = []
        elif isinstance(raw_placed_items, str):
            try:
                mutable["placed_items"] = json.loads(raw_placed_items)
            except json.JSONDecodeError:
                raise serializers.ValidationError(
                    {"placed_items": "Invalid JSON format for placed_items."}
                )

        return super().to_internal_value(mutable)

    def validate_placed_items(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("placed_items must be a list.")
        return value