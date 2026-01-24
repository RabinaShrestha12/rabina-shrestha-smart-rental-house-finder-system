from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Owner,Tenant,Listing

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
    class Meta:
        model = Listing
        fields = [
            "id", "owner", "title", "description", "property_type",
            "price_per_week", "location", "electricity_bill",
            "owner_contact_number", "owner_contact_email",
            "image",
            "pano_front", "pano_back", "pano_left", "pano_right", "pano_up", "pano_down",
            "is_available", "created_at"
        ]
        read_only_fields = ["id", "owner", "created_at"]
