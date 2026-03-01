from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.utils import timezone

# USER MODEL (single table for login)
class User(AbstractUser):
    USER_TYPE = (
        ("admin", "Admin"),
        ("owner", "Owner"),
        ("tenant", "Tenant"),
        ("provider", "Service Provider"),
    )

    role = models.CharField(max_length=20, choices=USER_TYPE, blank=True, default="tenant")
    is_email_verified = models.BooleanField(default=False)

    address = models.CharField(max_length=100, blank=True, default="")
    phone = models.CharField(max_length=30, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.username} ({self.role})"



# PENDING SIGNUP (OTP BEFORE REGISTRATION)
class PendingSignup(models.Model):
    email = models.EmailField(db_index=True)
    username = models.CharField(max_length=150)
    role = models.CharField(max_length=20)  # admin/owner/tenant/provider

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


# OTP FOR PENDING SIGNUP
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


# OWNER / TENANT PROFILES (optional tables, but user link MUST NOT be null)
class Owner(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owner",
    )
    # optional extra fields (User already has address/phone)
    location = models.CharField(max_length=200, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Owner({self.user.username})"


class Tenant(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tenant",
    )
    location = models.CharField(max_length=200, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Tenant({self.user.username})"


# SERVICE PROVIDER PROFILE (for provider dashboard & filtering)
class ServiceProviderProfile(models.Model):
    CATEGORY_CHOICES = (
        ("plumbing", "Plumbing"),
        ("electrical", "Electrical"),
        ("cleaning", "Cleaning"),
        ("internet", "Internet/WiFi"),
        ("gas", "Gas"),
        ("hvac", "AC / Heating"),
        ("pest_control", "Pest Control"),
        ("carpentry", "Carpentry"),
        ("painting", "Painting"),
        ("other", "Other"),
    )

    AVAILABILITY_CHOICES = (
        ("available", "Available"),
        ("busy", "Busy"),
        ("offline", "Offline"),
    )

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="provider_profile",
    )

    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default="other")
    service_area = models.CharField(max_length=120, blank=True, default="")
    phone = models.CharField(max_length=30, blank=True, default="")
    availability = models.CharField(max_length=20, choices=AVAILABILITY_CHOICES, default="available")
    bio = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} ({self.category}) - {self.availability}"

# LISTING MODEL
class Listing(models.Model):
    PROPERTY_TYPE_CHOICES = [
        ("room", "Room"),
        ("house", "House"),
        ("apartment", "Apartment"),
    ]

    # ✅ keep simple: owner is a User with role="owner"
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

# BOOKING + CHAT (Tenant <-> Owner)
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


# REVIEWS / RATINGS
class Review(models.Model):
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="reviews")

    tenant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews_written",
    )

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews_received",
    )

    rating = models.PositiveSmallIntegerField(default=5)  # 1..5
    comment = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["listing", "tenant"], name="uniq_review_listing_tenant")
        ]

    def __str__(self):
        return f"Review(listing={self.listing_id}, tenant={self.tenant_id}, rating={self.rating})"


# ✅ OWNER -> PROVIDER MAINTENANCE JOB/REQUEST
# (Owner does NOT need to pick listing; listing is optional)
class MaintenanceRequest(models.Model):
    STATUS = (
        ("open", "Open"),
        ("in_progress", "In Progress"),
        ("resolved", "Resolved"),
        ("rejected", "Rejected"),
    )
    PRIORITY = (
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("emergency", "Emergency"),
    )
    CATEGORY = (
        ("plumbing", "Plumbing"),
        ("electrical", "Electrical"),
        ("cleaning", "Cleaning"),
        ("internet", "Internet/WiFi"),
        ("gas", "Gas"),
        ("hvac", "AC / Heating"),
        ("pest_control", "Pest Control"),
        ("carpentry", "Carpentry"),
        ("painting", "Painting"),
        ("other", "Other"),
    )

    # ✅ created by owner
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owner_maintenance_requests",
    )

    # ✅ optional: connect to listing if you want (not required)
    listing = models.ForeignKey(
        "Listing",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="maintenance_requests",
    )

    # ✅ optional: assign provider profile
    assigned_provider = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="provider_jobs",
        limit_choices_to={"role": "provider"},
    )

    category = models.CharField(max_length=30, choices=CATEGORY, default="other")
    priority = models.CharField(max_length=20, choices=PRIORITY, default="medium")
    status = models.CharField(max_length=20, choices=STATUS, default="open")

    title = models.CharField(max_length=120, default="")
    description = models.TextField(default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"MaintenanceRequest#{self.id} ({self.category})"


# ✅ OWNER <-> PROVIDER IN-APP MESSAGES (Provider Inbox)
class ProviderMessage(models.Model):
    maintenance = models.ForeignKey(
        MaintenanceRequest,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="messages",
    )

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="provider_messages_sent",
    )

    provider = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="provider_messages_received",
    )

    # who sent THIS message (owner or provider)
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="provider_messages_as_sender",
    )

    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=["provider", "-created_at"]),
            models.Index(fields=["owner", "-created_at"]),
        ]

    def __str__(self):
        return f"ProviderMessage#{self.id} to provider={self.provider_id}"


# IN-APP NOTIFICATIONS
class Notification(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=140, default="")
    message = models.TextField(default="")
    link = models.CharField(max_length=255, blank=True, default="")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notification({self.user_id}) {self.title}"


# REMINDERS
class Reminder(models.Model):
    TYPE = (
        ("rent", "Rent"),
        ("water", "Water"),
        ("electricity", "Electricity"),
        ("other", "Other"),
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reminders")
    reminder_type = models.CharField(max_length=20, choices=TYPE, default="rent")
    title = models.CharField(max_length=140, default="")
    amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    due_date = models.DateField()
    repeat_monthly = models.BooleanField(default=False)
    is_done = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Reminder({self.user_id}) {self.title}"


# NEARBY FACILITIES
class ListingFacility(models.Model):
    KIND = (
        ("bus_stop", "Bus Stop"),
        ("college", "College/University"),
        ("office", "Office"),
        ("market", "Market/Grocery"),
        ("hospital", "Hospital/Clinic"),
        ("atm", "ATM/Bank"),
        ("other", "Other"),
    )
    listing = models.ForeignKey("Listing", on_delete=models.CASCADE, related_name="facilities")
    kind = models.CharField(max_length=30, choices=KIND, default="other")
    name = models.CharField(max_length=120, default="")
    distance_m = models.PositiveIntegerField(null=True, blank=True)
    address = models.CharField(max_length=200, blank=True, default="")

    def __str__(self):
        return f"{self.kind}: {self.name}"


class RoommateProfile(models.Model):
    """
    One profile per tenant user.
    """
    GENDER_CHOICES = (
        ("male", "Male"),
        ("female", "Female"),
        ("other", "Other"),
        ("any", "Any"),
    )

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="roommate_profile"
    )

    # Basic info / preferences
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, default="any")
    preferred_gender = models.CharField(max_length=10, choices=GENDER_CHOICES, default="any")

    min_budget = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    max_budget = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    city = models.CharField(max_length=120, blank=True, default="")
    preferred_area = models.CharField(max_length=120, blank=True, default="")  # e.g., "Canberra CBD"

    move_in_date = models.DateField(null=True, blank=True)
    stay_length_months = models.IntegerField(null=True, blank=True)  # optional

    # Lifestyle flags
    smoker = models.BooleanField(default=False)
    pets_ok = models.BooleanField(default=True)
    tidy_level = models.IntegerField(default=3)  # 1..5
    quiet_level = models.IntegerField(default=3)  # 1..5

    # Free-text
    bio = models.TextField(blank=True, default="")

    is_active = models.BooleanField(default=True)  # hide profile if not looking
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"RoommateProfile({self.user.username})"


class RoommateRequest(models.Model):
    """
    Tenant -> Tenant roommate request
    """
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("rejected", "Rejected"),
        ("cancelled", "Cancelled"),
    )

    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="roommate_requests_sent"
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="roommate_requests_received"
    )

    message = models.TextField(blank=True, default="")
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default="pending")

    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("from_user", "to_user")  # prevent duplicates

    def __str__(self):
        return f"RoommateRequest({self.from_user} -> {self.to_user}, {self.status})"

class RoommateChatThread(models.Model):
    """
    One chat thread for two tenants (created after request accepted)
    """
    user1 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="roommate_threads_as_user1",
        limit_choices_to={"role": "tenant"},
    )
    user2 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="roommate_threads_as_user2",
        limit_choices_to={"role": "tenant"},
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user1", "user2"], name="uniq_roommate_thread_pair")
        ]

    def __str__(self):
        return f"RoommateChatThread({self.user1_id}, {self.user2_id})"


class RoommateChatMessage(models.Model):
    """
    Messages inside roommate chat thread
    """
    thread = models.ForeignKey(
        RoommateChatThread,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="roommate_chat_messages_sent",
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"RoommateChatMessage(thread={self.thread_id}, sender={self.sender_id})"