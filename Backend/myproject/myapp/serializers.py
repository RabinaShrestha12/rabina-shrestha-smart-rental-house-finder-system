from rest_framework import serializers
from django.conf import settings
from urllib.parse import urlparse
from django.contrib.auth import get_user_model
from .models import Owner, Tenant, Listing


User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email',
            'role', 'address', 'phone', 'created_at', 'updated_at'
        ]

class OwnerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "phone", "address", "role"]

class OwnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Owner
        fields = '__all__'

class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = "__all__"

class ListingSerializer(serializers.ModelSerializer):
    # ✅ cover url
    image_url = serializers.SerializerMethodField()

    # ✅ ONE panorama (recommended)
    pano_url = serializers.SerializerMethodField()

    # ✅ cubemap urls (optional – you can keep)
    pano_front_url = serializers.SerializerMethodField()
    pano_back_url = serializers.SerializerMethodField()
    pano_left_url = serializers.SerializerMethodField()
    pano_right_url = serializers.SerializerMethodField()
    pano_up_url = serializers.SerializerMethodField()
    pano_down_url = serializers.SerializerMethodField()

    has_360 = serializers.SerializerMethodField()

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

    # ✅ NEW: panorama url from pano_360 field
    def get_pano_url(self, obj):
        request = self.context.get("request")
        return self._abs(request, obj.pano_360)

    # cubemap url getters
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

    def get_has_360(self, obj):
        return all([
            bool(obj.pano_front),
            bool(obj.pano_back),
            bool(obj.pano_left),
            bool(obj.pano_right),
            bool(obj.pano_up),
            bool(obj.pano_down),
        ])

    class Meta:
        model = Listing
        fields = [
            "id", "owner", "title", "description", "property_type",
            "price_per_week", "location", "electricity_bill",
            "owner_contact_number", "owner_contact_email",

            # stored files
            "image",
            "pano_360",  # ✅ NEW FIELD
            "pano_front", "pano_back", "pano_left", "pano_right", "pano_up", "pano_down",

            # urls
            "image_url",
            "pano_url",  # ✅ NEW URL
            "pano_front_url", "pano_back_url", "pano_left_url",
            "pano_right_url", "pano_up_url", "pano_down_url",

            "has_360",
            "is_available", "created_at",
        ]

        read_only_fields = ["id", "owner", "created_at"]

        extra_kwargs = {
            "image": {"required": False, "allow_null": True},

            # ✅ pano_360 not required
            "pano_360": {"required": False, "allow_null": True},

            # cubemap fields not required
            "pano_front": {"required": False, "allow_null": True},
            "pano_back": {"required": False, "allow_null": True},
            "pano_left": {"required": False, "allow_null": True},
            "pano_right": {"required": False, "allow_null": True},
            "pano_up": {"required": False, "allow_null": True},
            "pano_down": {"required": False, "allow_null": True},
        }
