from django.urls import path

from billing.views import (
    SubscriptionCheckoutView,
    SubscriptionDetailView,
    SubscriptionPortalView,
    stripe_webhook,
)

urlpatterns = [
    path("billing/webhooks/stripe/", stripe_webhook, name="stripe-webhook"),
    path(
        "tenants/<slug:tenant_slug>/admin/billing/",
        SubscriptionDetailView.as_view(),
        name="subscription-detail",
    ),
    path(
        "tenants/<slug:tenant_slug>/admin/billing/checkout/",
        SubscriptionCheckoutView.as_view(),
        name="subscription-checkout",
    ),
    path(
        "tenants/<slug:tenant_slug>/admin/billing/portal/",
        SubscriptionPortalView.as_view(),
        name="subscription-portal",
    ),
]
