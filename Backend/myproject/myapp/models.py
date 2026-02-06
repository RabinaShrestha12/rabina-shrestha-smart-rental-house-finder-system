from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.utils import timezone


# =========================
# USER MODEL (single table for login)
# =========================
class User(AbstractUser):
    USER_TYPE = (
        ("admin", "Admin"),
        ("owner", "Owner"),
        ("tenant", "Tenant"),
    )

    role = models.CharField(max_length=20, choices=USER_TYPE, blank=True, default="tenant")
    is_email_verified = models.BooleanField(default=False)

    address = models.CharField(max_length=100, blank=True, default="")
    phone = models.CharField(max_length=30, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.username} ({self.role})"


# =========================
# PENDING SIGNUP (OTP BEFORE REGISTRATION)
# =========================
class PendingSignup(models.Model):
    email = models.EmailField(db_index=True)
    username = models.CharField(max_length=150)
    role = models.CharField(max_length=20)  # admin/owner/tenant

    password_hash = models.CharField(max_length=128)

    address = models.CharField(max_length=100, blank=True, default="")
    phone = models.CharField(max_length=30, blank=True, default="")

    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()

    created_at = models.DateTimeField(auto_now_add=True)

    def is_expired(self):
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"PendingSignup({self.email}, role={self.role})"


# =========================
# OTP FOR PENDING SIGNUP
# =========================
class PendingSignupOTP(models.Model):
    PURPOSE_CHOICES = (("signup", "signup"),)

    pending = models.ForeignKey(PendingSignup, on_delete=models.CASCADE, related_name="otps")
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES, default="signup")

    code_hash = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    is_used = models.BooleanField(default=False)
    attempts = models.PositiveSmallIntegerField(default=0)

    def __str__(self):
        return f"PendingSignupOTP({self.pending.email})"


# =========================
# OWNER / TENANT TABLES
# =========================
class Owner(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owner",
        null=True,       # ✅ TEMP (fix migration issue)
        blank=True,      # ✅ TEMP
    )

    address = models.CharField(max_length=100, blank=True, default="")
    phone = models.CharField(max_length=30, blank=True, default="")
    location = models.CharField(max_length=200, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Owner({self.user.username if self.user else 'unlinked'})"


class Tenant(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tenant",
        null=True,       # ✅ TEMP (fix migration issue)
        blank=True,      # ✅ TEMP
    )

    address = models.CharField(max_length=100, blank=True, default="")
    phone = models.CharField(max_length=30, blank=True, default="")
    location = models.CharField(max_length=200, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Tenant({self.user.username if self.user else 'unlinked'})"


# =========================
# LISTING MODEL
# =========================
class Listing(models.Model):
    PROPERTY_TYPE_CHOICES = [
        ("room", "Room"),
        ("house", "House"),
        ("apartment", "Apartment"),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="listings",
    )

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    property_type = models.CharField(max_length=20, choices=PROPERTY_TYPE_CHOICES, default="room")
    price_per_month = models.DecimalField(max_digits=10, decimal_places=2)
    location = models.CharField(max_length=255)
    # in Listing model
    latitude = models.DecimalField(max_digits=12, decimal_places=8, null=True, blank=True)
    longitude = models.DecimalField(max_digits=12, decimal_places=8, null=True, blank=True)

    electricity_bill = models.CharField(max_length=100, blank=True, default="")
    owner_contact_number = models.CharField(max_length=30, blank=True, default="")
    owner_contact_email = models.EmailField(blank=True, default="")

    image = models.ImageField(upload_to="listings/", blank=True, null=True)

    pano_360 = models.ImageField(upload_to="listings/pano360/", blank=True, null=True)
    pano_front = models.ImageField(upload_to="listings/360/", blank=True, null=True)
    pano_back = models.ImageField(upload_to="listings/360/", blank=True, null=True)
    pano_left = models.ImageField(upload_to="listings/360/", blank=True, null=True)
    pano_right = models.ImageField(upload_to="listings/360/", blank=True, null=True)
    pano_up = models.ImageField(upload_to="listings/360/", blank=True, null=True)
    pano_down = models.ImageField(upload_to="listings/360/", blank=True, null=True)

    is_available = models.BooleanField(default=True)

    STATUS_AVAILABLE = "available"
    STATUS_BOOKED = "booked"
    STATUS_CHOICES = [
        (STATUS_AVAILABLE, "Available"),
        (STATUS_BOOKED, "Booked"),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_AVAILABLE, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def mark_booked(self):
        self.is_available = False
        self.status = self.STATUS_BOOKED
        self.save(update_fields=["is_available", "status"])

    def mark_available(self):
        self.is_available = True
        self.status = self.STATUS_AVAILABLE
        self.save(update_fields=["is_available", "status"])

    def __str__(self):
        return f"{self.title} - {self.location}"


# =========================
# OPTION 1 BOOKING + CHAT SYSTEM
# =========================
class BookingRequest(models.Model):
    STATUS_PENDING = "pending"
    STATUS_ACCEPTED = "accepted"
    STATUS_REJECTED = "rejected"
    STATUS_CANCELLED = "cancelled"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_ACCEPTED, "Accepted"),
        (STATUS_REJECTED, "Rejected"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="booking_requests")
    tenant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="booking_requests",
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["listing", "tenant"], name="uniq_listing_tenant_booking")
        ]

    @property
    def owner(self):
        return self.listing.owner

    def __str__(self):
        return f"BookingRequest(listing={self.listing_id}, tenant={self.tenant_id}, status={self.status})"


class BookingMessage(models.Model):
    request = models.ForeignKey(
        BookingRequest,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_booking_messages",
    )

    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    def __str__(self):
        return f"BookingMessage(req={self.request_id}, sender={self.sender_id})"
