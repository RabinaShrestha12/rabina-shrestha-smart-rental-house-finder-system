from django.urls import path
from .view.auth_views import register_admin, login_admin,register_tenant, register_owner_by_admin, login_user,list_all_users,user_detail_crud,admin_list_tenants,admin_tenant_detail


urlpatterns = [
    # ----------------- Admin Auth -----------------
    path("register/", register_admin),
    path("login/", login_admin),

    # ----------------- Tenant Auth -----------------
    path("tenant_register/",register_tenant),

    # ----------------- Owner Auth (Admin only) -----------------
    path("owner_register/", register_owner_by_admin),

    # ----------------- Owner/Tenant Login -----------------
    path("login_user/", login_user),

    # ----------------- Admin User Management -----------------
    path("admin/users/", list_all_users),
    path("admin/users/<int:user_id>/",user_detail_crud),

    # ----------------- Admin Tenant Details -----------------
    path("admin/tenants/",admin_list_tenants),
    path("admin/tenants/<int:tenant_id>/", admin_tenant_detail),
]
