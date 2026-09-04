from django.urls import path

from tenancy.views import activate_tenant, tenant_context

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
]
