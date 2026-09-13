from django.urls import path

from platform_admin.views import (
    PlatformOverviewView,
    PlatformPaymentListView,
    PlatformTenantDetailView,
    PlatformTenantListView,
    PlatformTenantStatusView,
)

urlpatterns = [
    path("overview/", PlatformOverviewView.as_view(), name="platform-overview"),
    path("payments/", PlatformPaymentListView.as_view(), name="platform-payment-list"),
    path("tenants/", PlatformTenantListView.as_view(), name="platform-tenant-list"),
    path(
        "tenants/<uuid:pk>/",
        PlatformTenantDetailView.as_view(),
        name="platform-tenant-detail",
    ),
    path(
        "tenants/<uuid:pk>/status/",
        PlatformTenantStatusView.as_view(),
        name="platform-tenant-status",
    ),
]
