from django.urls import path

from myapp.view.auth_views import (
    register_user, verify_otp, login_user, register_admin, login_admin,
    list_all_users, list_owners, list_tenants, list_providers, user_detail_crud,
    admin_send_email, request_password_reset_otp, reset_password,
)

from myapp.view.public.public_views import (
    PublicListingListView, PublicListingDetailView, PublicListingNearbyView,
)
from myapp.view.public.owner_views import OwnerCreateListingView
from myapp.view.owner_profile_views import owner_profile

from myapp.view.booking_views import (
    tenant_create_booking_request,
    tenant_my_booking_requests,
    owner_booking_inbox,
    booking_messages,
    booking_send_message,
    booking_update_message,
    booking_delete_message,
    owner_set_booking_status,
    create_message_legacy,
)

from myapp.view.owner_my_listings import (
    owner_my_listings, owner_my_listing_detail, owner_my_listing_update, owner_my_listing_delete,
)

from myapp.view.reviews_views import (
    tenant_create_review, listing_reviews, owner_my_reviews
)

from myapp.view.maintenance_views import (
    owner_create_maintenance_request,
    owner_maintenance_requests,
    owner_maintenance_request_detail,
    owner_update_maintenance_request,
    owner_delete_maintenance_request,
    owner_update_maintenance_status,
    owner_available_providers,
    owner_assign_provider,
    provider_my_jobs,
    provider_update_job_status,
    provider_accept_job,
)

from myapp.view import notifications_views as nv

from myapp.view.facilities_views import (
    listing_facilities, owner_add_facility, owner_delete_facility,
)

from myapp.view.maintenance_chat_views import (
    owner_send_maintenance_message,
    owner_get_maintenance_messages,
    owner_update_maintenance_message,
    owner_delete_maintenance_message,
    provider_inbox,
    provider_get_job_messages,
    provider_send_job_message,
    provider_update_job_message,
    provider_delete_job_message,
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
    roommate_sync_threads,
    roommate_update_message,
    roommate_delete_message,
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

from myapp.view.tenant_room_image_views import (
    TenantRoomImageSaveListCreateView,
    TenantRoomImageSaveRetrieveUpdateDeleteView,
)

from .view.admin_dashboard_views import (
    admin_dashboard_summary,
    admin_owner_property_details,
    admin_all_communications,
)
from myapp.view.contact_views import public_contact_create, admin_contact_messages

from myapp.view.contract_views import (
    OwnerContractListView,
    OwnerContractDetailView,
    OwnerSendContractView,
    OwnerFinalizeContractView,
    TenantContractListView,
    TenantContractDetailView,
    TenantRespondContractView,
)
from .view.owner_agreement_views import (
    OwnerPlatformAgreementView,
    OwnerPlatformAgreementRespondView,
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

    path("owner/my-listings/", owner_my_listings, name="owner_my_listings"),
    path("owner/my-listings/<int:pk>/", owner_my_listing_detail, name="owner_my_listing_detail"),
    path("owner/my-listings/<int:pk>/update/", owner_my_listing_update, name="owner_my_listing_update"),
    path("owner/my-listings/<int:pk>/delete/", owner_my_listing_delete, name="owner_my_listing_delete"),

    # BOOKING REQUESTS
    path("tenant/booking-requests/create/", tenant_create_booking_request),
    path("tenant/request-booking/<int:listing_id>/", tenant_create_booking_request),
    path("tenant/request-booking/", tenant_create_booking_request),

    path("tenant/booking-requests/", tenant_my_booking_requests),
    path("owner/booking-requests/", owner_booking_inbox),
    path("owner/booking-requests/<int:booking_id>/status/", owner_set_booking_status),

    # Booking message CRUD
    path("booking-requests/<int:booking_id>/messages/", booking_messages),
    path("booking-requests/<int:booking_id>/messages/send/", booking_send_message),
    path("booking-messages/<int:message_id>/update/", booking_update_message),
    path("booking-messages/<int:message_id>/delete/", booking_delete_message),

    # Legacy booking message create
    path("messages/", create_message_legacy),

    # REVIEWS
    path("reviews/create/", tenant_create_review),
    path("listings/<int:listing_id>/reviews/", listing_reviews),
    path("owner/reviews/", owner_my_reviews),

    # MAINTENANCE
    path("owner/maintenance/create/", owner_create_maintenance_request, name="owner_create_maintenance_request"),
    path("owner/maintenance/", owner_maintenance_requests, name="owner_maintenance_requests"),

    path("owner/maintenance/<int:req_id>/", owner_maintenance_request_detail, name="owner_maintenance_request_detail"),
    path("owner/maintenance/<int:req_id>/update/", owner_update_maintenance_request, name="owner_update_maintenance_request"),
    path("owner/maintenance/<int:req_id>/delete/", owner_delete_maintenance_request, name="owner_delete_maintenance_request"),

    path("owner/maintenance/<int:req_id>/status/", owner_update_maintenance_status, name="owner_update_maintenance_status"),

    path("owner/providers/", owner_available_providers, name="owner_available_providers"),
    path("owner/maintenance/<int:req_id>/assign/", owner_assign_provider, name="owner_assign_provider"),

    path("provider/jobs/", provider_my_jobs, name="provider_my_jobs"),
    path("provider/jobs/<int:req_id>/accept/", provider_accept_job, name="provider_accept_job"),
    path("provider/jobs/<int:req_id>/status/", provider_update_job_status, name="provider_update_job_status"),

    # Notifications
    path("notifications/", nv.my_notifications, name="my_notifications"),
    path("notifications/<int:notif_id>/read/", nv.mark_notification_read, name="mark_notification_read"),
    path("reminders/create/", nv.create_reminder, name="create_reminder"),
    path("reminders/", nv.my_reminders, name="my_reminders"),
    path("reminders/<int:reminder_id>/", nv.update_reminder, name="update_reminder"),

    # Reminders
    path("reminders/create/", nv.create_reminder),
    path("reminders/", nv.my_reminders),
    path("reminders/<int:reminder_id>/", nv.update_reminder),

    # Facilities
    path("listings/<int:listing_id>/facilities/", listing_facilities),
    path("owner/listings/<int:listing_id>/facilities/add/", owner_add_facility),
    path("owner/facilities/<int:facility_id>/delete/", owner_delete_facility),



    # OWNER ↔ PROVIDER MAINTENANCE CHAT
    path("owner/maintenance/<int:req_id>/messages/", owner_get_maintenance_messages),
    path("owner/maintenance/<int:req_id>/messages/send/", owner_send_maintenance_message),
    path("owner/maintenance/messages/<int:message_id>/update/", owner_update_maintenance_message),
    path("owner/maintenance/messages/<int:message_id>/delete/", owner_delete_maintenance_message),

    path("provider/inbox/", provider_inbox),
    path("provider/maintenance/<int:req_id>/messages/", provider_get_job_messages),
    path("provider/maintenance/<int:req_id>/messages/send/", provider_send_job_message),
    path("provider/maintenance/messages/<int:message_id>/update/", provider_update_job_message),
    path("provider/maintenance/messages/<int:message_id>/delete/", provider_delete_job_message),

    # AI
    path("tenant/ai/suggest/", tenant_ai_suggest_nearby),

    # ROOMMATE FINDER
    path("tenant/roommates/profile/", roommate_my_profile),
    path("tenant/roommates/matches/", roommate_matches),
    path("tenant/roommates/request/send/", roommate_send_request),
    path("tenant/roommates/requests/", roommate_my_requests),
    path("tenant/roommates/request/<int:request_id>/respond/", roommate_respond_request),

    # Roommate chat CRUD
    path("tenant/roommates/chats/sync/", roommate_sync_threads),
    path("tenant/roommates/chats/", roommate_my_threads),
    path("tenant/roommates/chats/<int:thread_id>/messages/", roommate_thread_messages),
    path("tenant/roommates/chats/<int:thread_id>/send/", roommate_send_message),
    path("tenant/roommates/messages/<int:message_id>/update/", roommate_update_message),
    path("tenant/roommates/messages/<int:message_id>/delete/", roommate_delete_message),

    # FURNITURE MANAGEMENT
    path("furniture/", furniture_list, name="furniture_list"),
    path("admin/furniture/create/", furniture_create, name="furniture_create"),
    path("admin/furniture/<int:pk>/update/", furniture_update, name="furniture_update"),
    path("admin/furniture/<int:pk>/delete/", furniture_delete, name="furniture_delete"),

    # PAYMENTS
    path("payments/esewa/initiate/", initiate_esewa_booking_payment, name="initiate_esewa_booking_payment"),
    path("payments/esewa/success/", esewa_success, name="esewa_success"),
    path("payments/esewa/failure/", esewa_failure, name="esewa_failure"),

    path("tenant/booking-payments/my/", my_booking_payments, name="my_booking_payments"),
    path("admin/booking-payments/", admin_booking_payments, name="admin_booking_payments"),
    path("admin/booking-payments/<int:payment_id>/owner-paid/", mark_owner_booking_paid, name="mark_owner_booking_paid"),
    path("owner/booking-payments/", owner_booking_payments, name="owner_booking_payments"),

    
    # EXPENSE TRACKER
    path("tenant/expenses/", TenantExpenseListCreateView.as_view(), name="tenant_expense_list_create"),
    path("tenant/expenses/<int:pk>/", TenantExpenseDetailView.as_view(), name="tenant_expense_detail"),
    path("tenant/expenses/month-summary/", TenantExpenseMonthSummaryView.as_view(), name="tenant_expense_month_summary"),
    path("tenant/expenses/generate-month-notification/", GenerateEndOfMonthExpenseNotificationView.as_view(), name="generate_end_of_month_expense_notification"),
   
    # VIRTUAL FURNITURE ROOM IMAGES
    path(
        "tenant/virtual-furniture/room-images/",
        TenantRoomImageSaveListCreateView.as_view(),
    ),
    path(
        "tenant/virtual-furniture/room-images/<int:pk>/",
        TenantRoomImageSaveRetrieveUpdateDeleteView.as_view(),
    ),

    path("admin/dashboard-summary/", admin_dashboard_summary, name="admin-dashboard-summary"),
    path("admin/owners/<int:owner_id>/properties/", admin_owner_property_details, name="admin-owner-property-details"),
    path("admin/communications/", admin_all_communications, name="admin-all-communications"),

    path("public/contact/", public_contact_create, name="public_contact_create"),
    path("admin/contact-messages/", admin_contact_messages, name="admin_contact_messages"),

    path("owner/contracts/", OwnerContractListView.as_view(), name="owner-contract-list"),
    path("owner/contracts/<int:pk>/", OwnerContractDetailView.as_view(), name="owner-contract-detail"),
    path("owner/contracts/<int:pk>/send/", OwnerSendContractView.as_view(), name="owner-send-contract"),
    path("owner/contracts/<int:pk>/finalize/", OwnerFinalizeContractView.as_view(), name="owner-finalize-contract"),

    path("tenant/contracts/", TenantContractListView.as_view(), name="tenant-contract-list"),
    path("tenant/contracts/<int:pk>/", TenantContractDetailView.as_view(), name="tenant-contract-detail"),
    path("tenant/contracts/<int:pk>/respond/", TenantRespondContractView.as_view(), name="tenant-respond-contract"),

    path("owner/platform-agreement/", OwnerPlatformAgreementView.as_view(), name="owner-platform-agreement"),
    path("owner/platform-agreement/respond/", OwnerPlatformAgreementRespondView.as_view(), name="owner-platform-agreement-respond"),
]