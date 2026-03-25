from django.urls import path

from myapp.view.auth_views import (
    register_user, verify_otp, login_user, register_admin, login_admin,
    list_all_users, list_owners, list_tenants, list_providers, user_detail_crud,
    admin_send_email,request_password_reset_otp, reset_password,
)

from myapp.view.public.public_views import (
    PublicListingListView, PublicListingDetailView, PublicListingNearbyView,
)
from myapp.view.public.owner_views import OwnerCreateListingView
from myapp.view.owner_profile_views import owner_profile

from myapp.view.booking_views import (
    tenant_create_booking_request, tenant_my_booking_requests, owner_booking_inbox,
    booking_messages, booking_send_message, owner_set_booking_status, create_message_legacy,
)

from myapp.view.owner_my_listings import (
    owner_my_listings, owner_my_listing_detail, owner_my_listing_update, owner_my_listing_delete,
)

from myapp.view.reviews_views import (tenant_create_review, listing_reviews, owner_my_reviews)

from myapp.view.maintenance_views import (
    owner_create_maintenance_request, owner_maintenance_requests, owner_update_maintenance_status,
    owner_available_providers, owner_assign_provider,
    provider_my_jobs, provider_update_job_status, provider_accept_job,
)

from myapp.view import notifications_views as nv

from myapp.view.facilities_views import (
    listing_facilities, owner_add_facility, owner_delete_facility,
)

from myapp.view.maintenance_chat_views import (
    owner_send_maintenance_message, owner_get_maintenance_messages,
    provider_inbox, provider_get_job_messages, provider_send_job_message,
)

from myapp.view.ai_suggestions_views import tenant_ai_suggest_nearby

from myapp.view.roommate_views import (
    roommate_my_profile,
    roommate_matches,
    roommate_send_request,
    roommate_my_requests,
    roommate_respond_request,
)

from myapp.view.roommate_chat_views import (
    roommate_my_threads,
    roommate_thread_messages,
    roommate_send_message,
    roommate_sync_threads,   # ✅ add this
)

from myapp.view.furniture_views import (
    furniture_list,
    furniture_create,
    furniture_update,
    furniture_delete,
)


from .view.esewa_payment_views import (
    initiate_esewa_booking_payment,
    esewa_success,
    esewa_failure,
    my_booking_payments,
    admin_booking_payments,
    mark_owner_booking_paid,
    owner_booking_payments,
)

from myapp.view.expense_views import (
    TenantExpenseListCreateView,
    TenantExpenseDetailView,
    TenantExpenseMonthSummaryView,
    GenerateEndOfMonthExpenseNotificationView,
)

urlpatterns = [
    path("register_user/", register_user),
    path("verify-otp/", verify_otp),
    path("login_user/", login_user),
    path("register_admin/", register_admin),
    path("login_admin/", login_admin),

    path("admin/users/", list_all_users),
    path("admin/owners/", list_owners),
    path("admin/tenants/", list_tenants),
    path("admin/providers/", list_providers),
    path("admin/users/<int:user_id>/", user_detail_crud),
    path("admin/send-email/", admin_send_email),

    path("request-password-reset-otp/", request_password_reset_otp),
    path("reset-password/", reset_password),

    path("public/listings/", PublicListingListView.as_view()),
    path("public/listings/nearby/", PublicListingNearbyView.as_view()),
    path("public/listings/<int:pk>/", PublicListingDetailView.as_view()),

    path("owner/listings/create/", OwnerCreateListingView.as_view()),
    path("owner-profile/", owner_profile),

    path("owner/my-listings/", owner_my_listings),
    path("owner/my-listings/<int:pk>/", owner_my_listing_detail),
    path("owner/my-listings/<int:pk>/update/", owner_my_listing_update),
    path("owner/my-listings/<int:pk>/delete/", owner_my_listing_delete),

    path("tenant/booking-requests/create/", tenant_create_booking_request),
    path("tenant/request-booking/<int:listing_id>/", tenant_create_booking_request),
    path("tenant/request-booking/", tenant_create_booking_request),

    path("tenant/booking-requests/", tenant_my_booking_requests),
    path("owner/booking-requests/", owner_booking_inbox),
    path("owner/booking-requests/<int:booking_id>/status/", owner_set_booking_status),

    path("booking-requests/<int:booking_id>/messages/", booking_messages),
    path("booking-requests/<int:booking_id>/messages/send/", booking_send_message),
    path("messages/", create_message_legacy),

    path("reviews/create/", tenant_create_review),
    path("listings/<int:listing_id>/reviews/", listing_reviews),
    path("owner/reviews/", owner_my_reviews),

    path("owner/maintenance/create/", owner_create_maintenance_request),
    path("owner/maintenance/", owner_maintenance_requests),
    path("owner/maintenance/<int:req_id>/status/", owner_update_maintenance_status),

    path("owner/providers/", owner_available_providers),
    path("owner/maintenance/<int:req_id>/assign/", owner_assign_provider),

    path("provider/jobs/", provider_my_jobs),
    path("provider/jobs/<int:req_id>/accept/", provider_accept_job),
    path("provider/jobs/<int:req_id>/status/", provider_update_job_status),

    path("notifications/", nv.my_notifications),
    path("notifications/<int:notif_id>/read/", nv.mark_notification_read),

    path("reminders/create/", nv.create_reminder),
    path("reminders/", nv.my_reminders),
    path("reminders/<int:reminder_id>/", nv.update_reminder),

    path("listings/<int:listing_id>/facilities/", listing_facilities),
    path("owner/listings/<int:listing_id>/facilities/add/", owner_add_facility),
    path("owner/facilities/<int:facility_id>/delete/", owner_delete_facility),

    path("owner/maintenance/<int:req_id>/messages/", owner_get_maintenance_messages),
    path("owner/maintenance/<int:req_id>/messages/send/", owner_send_maintenance_message),

    path("provider/inbox/", provider_inbox),
    path("provider/maintenance/<int:req_id>/messages/", provider_get_job_messages),
    path("provider/maintenance/<int:req_id>/messages/send/", provider_send_job_message),

    path("tenant/ai/suggest/", tenant_ai_suggest_nearby),

    # Roommate Finder
    path("tenant/roommates/profile/", roommate_my_profile),
    path("tenant/roommates/matches/", roommate_matches),
    path("tenant/roommates/request/send/", roommate_send_request),
    path("tenant/roommates/requests/", roommate_my_requests),
    path("tenant/roommates/request/<int:request_id>/respond/", roommate_respond_request),

    # Roommate Chat
    path("tenant/roommates/chats/sync/", roommate_sync_threads),  # ✅ add this line
    path("tenant/roommates/chats/", roommate_my_threads),
    path("tenant/roommates/chats/<int:thread_id>/messages/", roommate_thread_messages),
    path("tenant/roommates/chats/<int:thread_id>/send/", roommate_send_message),

    # Furniture Management
    path("furniture/", furniture_list),
    path("admin/furniture/create/", furniture_create),
    path("admin/furniture/<int:pk>/update/", furniture_update),
    path("admin/furniture/<int:pk>/delete/", furniture_delete),


    path("payments/esewa/initiate/", initiate_esewa_booking_payment),
    path("payments/esewa/success/", esewa_success),
    path("payments/esewa/failure/", esewa_failure),

    path("tenant/booking-payments/my/", my_booking_payments),
    path("admin/booking-payments/", admin_booking_payments),
    path("admin/booking-payments/<int:payment_id>/owner-paid/", mark_owner_booking_paid),
    path("owner/booking-payments/", owner_booking_payments),

    # Expense tracker
    path("tenant/expenses/", TenantExpenseListCreateView.as_view()),
    path("tenant/expenses/<int:pk>/", TenantExpenseDetailView.as_view()),
    path("tenant/expenses/month-summary/", TenantExpenseMonthSummaryView.as_view()),
    path("tenant/expenses/generate-month-notification/", GenerateEndOfMonthExpenseNotificationView.as_view()),
]

   
