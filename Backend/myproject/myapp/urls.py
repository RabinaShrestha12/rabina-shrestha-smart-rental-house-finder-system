from django.urls import path
from myapp.view.public.tenant_views import TenantRequestBookingView
from myapp.view.owner_profile_views import owner_profile
from myapp.view.public.public_views import PublicListingListView, PublicListingDetailView
from myapp.view.public.owner_views import OwnerCreateListingView

from myapp.view.auth_views import (
    register_user, login_user, register_admin, login_admin,
    verify_email_otp, resend_verification_code,
    list_all_users, list_owners, list_tenants, user_detail_crud,
)

urlpatterns = [
    # AUTH
    path("register_user/", register_user),
    path("login_user/", login_user),
    path("register/", register_admin),
    path("login/", login_admin),

    # OTP
    path("verify-otp/", verify_email_otp),
    path("resend-verification/", resend_verification_code),

    # ADMIN
    path("admin/users/", list_all_users),
    path("admin/users/owners/", list_owners),
    path("admin/users/tenants/", list_tenants),
    path("admin/users/<int:user_id>/", user_detail_crud),



    # PUBLIC
    path("public/listings/", PublicListingListView.as_view()),
    path("public/listings/<int:pk>/", PublicListingDetailView.as_view()),

    # OWNER
    path("owner/listings/create/", OwnerCreateListingView.as_view()),

    # TENANT
    path(
        "tenant/request-booking/<int:listing_id>/",
        TenantRequestBookingView.as_view(),
        name="tenant-request-booking"
    ),

    # PROFILE
    path("owner-profile/", owner_profile),
]
