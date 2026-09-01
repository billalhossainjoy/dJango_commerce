from django.urls import path

from tenancy.views import tenant_context

urlpatterns = [
    path("tenant/", tenant_context, name="tenant-context"),
]
