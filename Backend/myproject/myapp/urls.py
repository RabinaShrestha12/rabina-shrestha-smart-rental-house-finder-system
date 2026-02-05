# myproject/myapp/urls.py
from django.urls import path

from myapp.view.auth_views import (
    register_user,
    verify_otp,
    login_user,
    register_admin,
    login_admin,
    list_all_users,
    list_owners,
    list_tenants,
    user_detail_crud,
    admin_send_email,
)

from myapp.view.public.public_views import (
    PublicListingListView,
    PublicListingDetailView,
)

from myapp.view.public.owner_views import OwnerCreateListingView
from myapp.view.owner_profile_views import owner_profile

from myapp.view.booking_views import (
    tenant_create_booking_request,
    tenant_my_booking_requests,
    owner_booking_inbox,

    booking_messages,
    booking_send_message,
    owner_set_booking_status,

    # ✅ NEW (to fix /api/messages/ 404)
    create_message_legacy,
)

# ✅ OWNER: my listings endpoints (view / detail / update / delete)
from myapp.view.owner_my_listings import (
    owner_my_listings,
    owner_my_listing_detail,
    owner_my_listing_update,
    owner_my_listing_delete,
)

urlpatterns = [
    # ✅ OTP flow (tenant/owner)
    path("register_user/", register_user),
    path("verify-otp/", verify_otp),

    # ✅ Logins
    path("login_user/", login_user),
    path("register_admin/", register_admin),
    path("login_admin/", login_admin),

    # ✅ Admin management
    path("admin/users/", list_all_users),
    path("admin/owners/", list_owners),
    path("admin/tenants/", list_tenants),
    path("admin/users/<int:user_id>/", user_detail_crud),
    path("admin/send-email/", admin_send_email),

    # ✅ Public listings
    path("public/listings/", PublicListingListView.as_view()),
    path("public/listings/<int:pk>/", PublicListingDetailView.as_view()),

    # ✅ Owner create listing
    path("owner/listings/create/", OwnerCreateListingView.as_view()),

    # ✅ Owner profile
    path("owner-profile/", owner_profile),

    # =======================================================
    # ✅ OWNER: VIEW / DETAIL / UPDATE / DELETE (MY POSTS)
    # =======================================================
    path("owner/my-listings/", owner_my_listings),                        # GET (list)
    path("owner/my-listings/<int:pk>/", owner_my_listing_detail),         # GET (single)
    path("owner/my-listings/<int:pk>/update/", owner_my_listing_update),  # PATCH/PUT
    path("owner/my-listings/<int:pk>/delete/", owner_my_listing_delete),  # DELETE

    # =======================================================
    # ✅ BOOKING SYSTEM (Request + Inbox + Messages)
    # =======================================================
    path("tenant/booking-requests/create/", tenant_create_booking_request),
    path("tenant/booking-requests/", tenant_my_booking_requests),
    path("owner/booking-requests/", owner_booking_inbox),

    path("booking-requests/<int:booking_id>/messages/", booking_messages),           # GET
    path("booking-requests/<int:booking_id>/messages/send/", booking_send_message),  # POST

    path("owner/booking-requests/<int:booking_id>/status/", owner_set_booking_status),

    # =======================================================
    # ✅ FIX: Frontend was calling /api/messages/ (404)
    # Now this endpoint exists.
    # =======================================================
    path("messages/", create_message_legacy),  # POST
]
