from django.urls import include, path

from config.views import health, readiness

urlpatterns = [
    path("health/", health, name="api-health"),
    path("readiness/", readiness, name="api-readiness"),
    path("", include("tenancy.urls")),
]
