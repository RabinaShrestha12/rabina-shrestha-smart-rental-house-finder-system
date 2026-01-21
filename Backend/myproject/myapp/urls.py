from django.urls import path
from myapp.view.auth_views import (
    register_user,
    login_user,
    register_admin,
    login_admin,
    list_all_users,
    list_owners,
    list_tenants,
    user_detail_crud,
)

urlpatterns = [
    # OWNER / TENANT (PUBLIC)
    path("register_user/", register_user),
    path("login_user/", login_user),

    # ADMIN (PUBLIC FOR FIRST ADMIN CREATION)
    path("register/", register_admin),
    path("login/", login_admin),

    # ADMIN DASHBOARD / MANAGEMENT
    path("admin/users/", list_all_users),
    path("admin/users/owners/", list_owners),
    path("admin/users/tenants/", list_tenants),
    path("admin/users/<int:user_id>/", user_detail_crud),
]
