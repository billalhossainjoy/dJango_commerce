from django.contrib import admin

from tenancy.models import Tenant, TenantHostname, TenantOwner


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("name", "slug")


@admin.register(TenantOwner)
class TenantOwnerAdmin(admin.ModelAdmin):
    list_display = ("tenant", "user", "created_at")
    list_select_related = ("tenant", "user")
    search_fields = ("tenant__name", "tenant__slug", "user__email")


@admin.register(TenantHostname)
class TenantHostnameAdmin(admin.ModelAdmin):
    list_display = ("hostname", "tenant", "kind", "is_canonical", "is_active")
    list_filter = ("kind", "is_canonical", "is_active")
    list_select_related = ("tenant",)
    search_fields = ("hostname", "tenant__name", "tenant__slug")
