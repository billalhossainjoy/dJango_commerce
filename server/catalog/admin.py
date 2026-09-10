from django.contrib import admin

from catalog.models import Product, ProductImage


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "price_cents", "stock_quantity", "is_active")
    list_filter = ("is_active", "tenant")
    search_fields = ("name", "slug")


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ("public_id", "product", "tenant", "status", "sort_order")
    list_filter = ("status", "tenant")
    search_fields = ("public_id", "product__name")
    readonly_fields = ("public_id", "version", "format", "created_at", "updated_at")
