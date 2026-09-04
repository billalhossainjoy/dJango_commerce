from django.urls import include, path

from config.views import health, readiness

urlpatterns = [
    path("health/", health, name="api-health"),
    path("readiness/", readiness, name="api-readiness"),
    path("auth/", include("accounts.urls")),
    path(
        "tenants/<slug:tenant_slug>/auth/",
        include("accounts.customer_urls"),
    ),
    path("", include("tenancy.urls")),
    path("", include("catalog.urls")),
]
