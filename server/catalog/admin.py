from django.contrib import admin

from catalog.models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "price_cents", "stock_quantity", "is_active")
    list_filter = ("is_active", "tenant")
    search_fields = ("name", "slug")
