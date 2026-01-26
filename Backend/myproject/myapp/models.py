from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from decimal import Decimal


# Create your models here.
class User(AbstractUser):
    USER_TYPE = (
        ('admin','Admin'),
        ('owner','Owner'),
        ('tenant','Tenant'),
    )
    role = models.CharField(max_length=100, choices=USER_TYPE, blank=True, default="tenant")
    address = models.CharField(max_length=100, blank=True, default="")
    phone = models.CharField(max_length=30, blank=True, default="")  # ✅ change
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Owner(models.Model):
    address = models.CharField(max_length=100)
    phone = models.CharField(max_length=30)  # ✅ change
    location = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Owner {self.id}"
    
    
class Tenant(models.Model):
    address = models.CharField(max_length=100)
    phone = models.CharField(max_length=30)  # ✅ change
    location = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Tenant {self.id}"

class OwnerProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="owner_profile")
    address = models.CharField(max_length=100, blank=True, default="")
    phone = models.CharField(max_length=30, blank=True, default="")
    location = models.CharField(max_length=200, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"OwnerProfile({self.user.username})"

class TenantProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="tenant_profile")
    location = models.CharField(max_length=200, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"TenantProfile({self.user.username})"


class Listing(models.Model):
    PROPERTY_TYPE_CHOICES = [
        ("room", "Room"),
        ("house", "House"),
        ("apartment", "Apartment"),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="listings"
    )

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    property_type = models.CharField(
        max_length=20,
        choices=PROPERTY_TYPE_CHOICES,
        default="room"
    )

    price_per_week = models.DecimalField(max_digits=10, decimal_places=2)
    location = models.CharField(max_length=255)

    # ✅ extra fields you asked
    electricity_bill = models.CharField(max_length=100, blank=True, default="")

    owner_contact_number = models.CharField(max_length=30, blank=True, default="")
    owner_contact_email = models.EmailField(blank=True, default="")

    # ✅ cover image
    image = models.ImageField(upload_to="listings/", blank=True, null=True)

    # ✅ 360 panorama (ONE image - recommended)
    pano_360 = models.ImageField(upload_to="listings/pano360/", blank=True, null=True)


    # ✅ 360 images (6 sides)
    pano_front = models.ImageField(upload_to="listings/360/", blank=True, null=True)
    pano_back  = models.ImageField(upload_to="listings/360/", blank=True, null=True)
    pano_left  = models.ImageField(upload_to="listings/360/", blank=True, null=True)
    pano_right = models.ImageField(upload_to="listings/360/", blank=True, null=True)
    pano_up    = models.ImageField(upload_to="listings/360/", blank=True, null=True)
    pano_down  = models.ImageField(upload_to="listings/360/", blank=True, null=True)

    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.location}"

    