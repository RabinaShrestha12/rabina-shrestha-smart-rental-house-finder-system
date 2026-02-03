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

from myapp.view.public.public_views import PublicListingListView, PublicListingDetailView
from myapp.view.public.owner_views import OwnerCreateListingView
from myapp.view.public.tenant_views import TenantRequestBookingView
from myapp.view.owner_profile_views import owner_profile

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

    # ✅ Owner
    path("owner/listings/create/", OwnerCreateListingView.as_view()),

    # ✅ Tenant booking
    path("tenant/request-booking/<int:listing_id>/", TenantRequestBookingView.as_view()),

    # ✅ Profile
    path("owner-profile/", owner_profile),
]
