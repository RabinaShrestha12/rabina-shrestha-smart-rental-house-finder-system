from django.urls import path
<<<<<<< HEAD
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
=======
from .view.auth_views import register_user, login_user, user_detail_crud, register_admin, login_admin, list_all_users
from .view.owner_views import owner_register, owner_login, get_owner_profile, get_all_owners
from .view.tenant_views import tenant_register, tenant_login, get_tenant_profile, get_all_tenants

urlpatterns = [
    path('login/', login_admin),
    path('register/', register_admin),

    path('login-user/', login_user),
    path('register-user/', register_user),
    path('list-users/', list_all_users),
    path('list/<int:user_id>', user_detail_crud),

    path('owner-register/', owner_register),
    path('owner-login/', owner_login),
    path('owner-profile/', get_owner_profile),
    path('all-owners/', get_all_owners),

    path('tenant-register/', tenant_register),
    path('tenant-login/', tenant_login),
    path('tenant-profile/', get_tenant_profile),
    path('all-tenants/', get_all_tenants),
>>>>>>> 5cb67aff8d4d7675492669dcf029e2b6a7f92276
]
