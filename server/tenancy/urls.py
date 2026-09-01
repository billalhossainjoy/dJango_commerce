from django.urls import path

from tenancy.views import tenant_context

urlpatterns = [
    path(
        "tenants/<slug:tenant_slug>/",
        tenant_context,
        name="tenant-context",
    ),
]
