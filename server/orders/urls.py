from django.urls import path

from orders.views import (
    CartClaimView,
    CartDetailView,
    CartItemCreateView,
    CartItemDetailView,
    OrderCreateView,
)

urlpatterns = [
    path(
        "tenants/<slug:tenant_slug>/cart/",
        CartDetailView.as_view(),
        name="cart-detail",
    ),
    path(
        "tenants/<slug:tenant_slug>/cart/claim/",
        CartClaimView.as_view(),
        name="cart-claim",
    ),
    path(
        "tenants/<slug:tenant_slug>/cart/items/",
        CartItemCreateView.as_view(),
        name="cart-item-create",
    ),
    path(
        "tenants/<slug:tenant_slug>/cart/items/<uuid:item_id>/",
        CartItemDetailView.as_view(),
        name="cart-item-detail",
    ),
    path(
        "tenants/<slug:tenant_slug>/orders/",
        OrderCreateView.as_view(),
        name="order-create",
    ),
]
