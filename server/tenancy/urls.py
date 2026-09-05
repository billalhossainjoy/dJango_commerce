from django.urls import path

from tenancy.views import activate_tenant, owner_login_context, tenant_context

urlpatterns = [
    path(
        "tenants/<slug:tenant_slug>/",
        tenant_context,
        name="tenant-context",
    ),
    path(
        "tenants/<slug:tenant_slug>/activate/",
        activate_tenant,
        name="tenant-activate",
    ),
    path(
        "tenants/<slug:tenant_slug>/owner-login-context/",
        owner_login_context,
        name="tenant-owner-login-context",
    ),
]
