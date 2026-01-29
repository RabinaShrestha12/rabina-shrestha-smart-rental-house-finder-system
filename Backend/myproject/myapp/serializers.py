from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Owner, Tenant, Listing

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id", "username", "first_name", "last_name", "email",
            "role", "address", "phone", "created_at", "updated_at"
        ]


class OwnerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "phone", "address", "role"]


class OwnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Owner
        fields = "__all__"


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = "__all__"


from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from io import BytesIO
from PIL import Image, ImageOps

from .models import Owner, Tenant, Listing

User = get_user_model()


class ListingSerializer(serializers.ModelSerializer):
    # ✅ cover url
    image_url = serializers.SerializerMethodField()

    # ✅ ONE panorama (recommended)
    pano_url = serializers.SerializerMethodField()

    # ✅ face urls
    pano_front_url = serializers.SerializerMethodField()
    pano_back_url = serializers.SerializerMethodField()
    pano_left_url = serializers.SerializerMethodField()
    pano_right_url = serializers.SerializerMethodField()
    pano_up_url = serializers.SerializerMethodField()
    pano_down_url = serializers.SerializerMethodField()

    # ✅ Packed object for frontend cubemap viewer
    cubemap = serializers.SerializerMethodField()

    view_360_type = serializers.SerializerMethodField()
    has_360 = serializers.SerializerMethodField()

    # ---------------------------
    # URL helpers
    # ---------------------------
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
        return all([
            bool(obj.pano_front),
            bool(obj.pano_back),
            bool(obj.pano_left),
            bool(obj.pano_right),
            bool(obj.pano_up),
            bool(obj.pano_down),
        ])

    def get_cubemap(self, obj):
        # return urls always (even if some missing) so frontend can debug
        request = self.context.get("request")
        return {
            "front": self._abs(request, obj.pano_front),
            "back":  self._abs(request, obj.pano_back),
            "left":  self._abs(request, obj.pano_left),
            "right": self._abs(request, obj.pano_right),
            "up":    self._abs(request, obj.pano_up),
            "down":  self._abs(request, obj.pano_down),
        }

    def get_view_360_type(self, obj):
        if obj.pano_360:
            return "equirect"
        if self._has_cubemap(obj):
            return "cubemap"
        return "none"

    def get_has_360(self, obj):
        return bool(obj.pano_360) or self._has_cubemap(obj)

    # ---------------------------
    # ✅ IMPORTANT FIX:
    # Make cubemap faces SQUARE + same size
    # (prevents Three.js / WebGL black screen)
    # ---------------------------
    def _make_square(self, uploaded_file, size=1024):
        """
        Crops center to square and resizes to size x size.
        Works for any portrait/landscape WhatsApp photos.
        """
        if not uploaded_file:
            return None

        img = Image.open(uploaded_file)
        img = ImageOps.exif_transpose(img)  # fix phone rotation
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
        # cover image (optional)
        if validated_data.get("image"):
            validated_data["image"] = self._make_square(validated_data["image"], 1024)

        # cubemap faces (optional)
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
            "id", "owner", "title", "description", "property_type",
            "price_per_week", "location", "electricity_bill",
            "owner_contact_number", "owner_contact_email",

            # stored files
            "image",
            "pano_360",
            "pano_front", "pano_back", "pano_left", "pano_right", "pano_up", "pano_down",

            # urls
            "image_url",
            "pano_url",
            "pano_front_url", "pano_back_url", "pano_left_url",
            "pano_right_url", "pano_up_url", "pano_down_url",

            # packed object + helper
            "cubemap",
            "view_360_type",
            "has_360",

            "is_available", "created_at",
        ]

        read_only_fields = ["id", "owner", "created_at"]

        extra_kwargs = {
            "image": {"required": False, "allow_null": True},
            "pano_360": {"required": False, "allow_null": True},
            "pano_front": {"required": False, "allow_null": True},
            "pano_back":  {"required": False, "allow_null": True},
            "pano_left":  {"required": False, "allow_null": True},
            "pano_right": {"required": False, "allow_null": True},
            "pano_up":    {"required": False, "allow_null": True},
            "pano_down":  {"required": False, "allow_null": True},
        }
