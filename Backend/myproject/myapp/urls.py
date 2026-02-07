# myproject/myapp/urls.py
from django.urls import path

# =========================
# AUTH + OTP
# =========================
from myapp.view.auth_views import (
    register_user,
    verify_otp,
    login_user,
    register_admin,
    login_admin,
    list_all_users,
    list_owners,
    list_tenants,
    list_providers,
    user_detail_crud,
    admin_send_email,
)

# =========================
# PUBLIC LISTINGS
# =========================
from myapp.view.public.public_views import (
    PublicListingListView,
    PublicListingDetailView,
    PublicListingNearbyView,
)

# =========================
# OWNER LISTINGS + PROFILE
# =========================
from myapp.view.public.owner_views import OwnerCreateListingView
from myapp.view.owner_profile_views import owner_profile

# =========================
# BOOKINGS
# =========================
from myapp.view.booking_views import (
    tenant_create_booking_request,
    tenant_my_booking_requests,
    owner_booking_inbox,
    booking_messages,
    booking_send_message,
    owner_set_booking_status,
    create_message_legacy,
)

# =========================
# OWNER MY LISTINGS
# =========================
from myapp.view.owner_my_listings import (
    owner_my_listings,
    owner_my_listing_detail,
    owner_my_listing_update,
    owner_my_listing_delete,
)

# =========================
# REVIEWS
# =========================
from myapp.view.reviews_views import (
    tenant_create_review,
    listing_reviews,
    owner_my_reviews,
)

# =========================
# MAINTENANCE (Owner -> Provider version)
# ✅ REMOVED tenant maintenance imports because those functions do not exist
# =========================
from myapp.view.maintenance_views import (
    owner_create_maintenance_request,
    owner_maintenance_requests,
    owner_update_maintenance_status,

    # provider assignment
    owner_available_providers,
    owner_assign_provider,

    # provider dashboard
    provider_my_jobs,
    provider_update_job_status,
)

# =========================
# ✅ NOTIFICATIONS + REMINDERS (SAFE IMPORT)
# =========================
from myapp.view import notifications_views as nv

# =========================
# FACILITIES
# =========================
from myapp.view.facilities_views import (
    listing_facilities,
    owner_add_facility,
    owner_delete_facility,
)

urlpatterns = [
    # =========================
    # AUTH + OTP
    # =========================
    path("register_user/", register_user),
    path("verify-otp/", verify_otp),
    path("login_user/", login_user),
    path("register_admin/", register_admin),
    path("login_admin/", login_admin),

    # =========================
    # ADMIN
    # =========================
    path("admin/users/", list_all_users),
    path("admin/owners/", list_owners),
    path("admin/tenants/", list_tenants),
    path("admin/providers/", list_providers),
    path("admin/users/<int:user_id>/", user_detail_crud),
    path("admin/send-email/", admin_send_email),

    # =========================
    # PUBLIC LISTINGS
    # =========================
    path("public/listings/", PublicListingListView.as_view()),
    path("public/listings/nearby/", PublicListingNearbyView.as_view()),
    path("public/listings/<int:pk>/", PublicListingDetailView.as_view()),

    # =========================
    # OWNER LISTINGS
    # =========================
    path("owner/listings/create/", OwnerCreateListingView.as_view()),
    path("owner-profile/", owner_profile),

    path("owner/my-listings/", owner_my_listings),
    path("owner/my-listings/<int:pk>/", owner_my_listing_detail),
    path("owner/my-listings/<int:pk>/update/", owner_my_listing_update),
    path("owner/my-listings/<int:pk>/delete/", owner_my_listing_delete),

    # =========================
    # BOOKINGS
    # =========================
    path("tenant/booking-requests/create/", tenant_create_booking_request),
    path("tenant/request-booking/<int:listing_id>/", tenant_create_booking_request),
    path("tenant/request-booking/", tenant_create_booking_request),

    path("tenant/booking-requests/", tenant_my_booking_requests),
    path("owner/booking-requests/", owner_booking_inbox),
    path("owner/booking-requests/<int:booking_id>/status/", owner_set_booking_status),

    path("booking-requests/<int:booking_id>/messages/", booking_messages),
    path("booking-requests/<int:booking_id>/messages/send/", booking_send_message),
    path("messages/", create_message_legacy),

    # =========================
    # REVIEWS
    # =========================
    path("reviews/create/", tenant_create_review),
    path("listings/<int:listing_id>/reviews/", listing_reviews),
    path("owner/reviews/", owner_my_reviews),

    # =========================
    # ✅ MAINTENANCE (Owner -> Provider)
    # =========================
    path("owner/maintenance/create/", owner_create_maintenance_request),
    path("owner/maintenance/", owner_maintenance_requests),
    path("owner/maintenance/<int:req_id>/status/", owner_update_maintenance_status),

    # provider assignment (owner -> provider)
    path("owner/providers/", owner_available_providers),
    path("owner/maintenance/<int:req_id>/assign/", owner_assign_provider),

    # provider dashboard
    path("provider/jobs/", provider_my_jobs),
    path("provider/jobs/<int:req_id>/status/", provider_update_job_status),

    # =========================
    # ✅ NOTIFICATIONS + REMINDERS
    # (These routes require the functions to exist in notifications_views.py)
    # =========================
    path("notifications/", nv.my_notifications),
    path("notifications/<int:notif_id>/read/", nv.mark_notification_read),

    path("reminders/create/", nv.create_reminder),
    path("reminders/", nv.my_reminders),
    path("reminders/<int:reminder_id>/", nv.update_reminder),

    # =========================
    # FACILITIES
    # =========================
    path("listings/<int:listing_id>/facilities/", listing_facilities),
    path("owner/listings/<int:listing_id>/facilities/add/", owner_add_facility),
    path("owner/facilities/<int:facility_id>/delete/", owner_delete_facility),
]
