from django.urls import path

from catalog.views import (
    AdminProductDetailView,
    AdminProductListCreateView,
    PublicProductListView,
)

urlpatterns = [
    path(
        "tenants/<slug:tenant_slug>/products/",
        PublicProductListView.as_view(),
        name="public-product-list",
    ),
    path(
        "tenants/<slug:tenant_slug>/admin/products/",
        AdminProductListCreateView.as_view(),
        name="admin-product-list",
    ),
    path(
        "tenants/<slug:tenant_slug>/admin/products/<uuid:pk>/",
        AdminProductDetailView.as_view(),
        name="admin-product-detail",
    ),
]
