from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from accounts.models import OutboundEmail, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    ordering = ("email",)
    list_display = ("email", "account_type", "tenant", "is_staff", "is_active")
    list_filter = ("account_type", "is_staff", "is_active")
    search_fields = ("email", "tenant__name", "tenant__slug")
    readonly_fields = ("date_joined", "last_login", "email_verified_at")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Account",
            {
                "fields": (
                    "account_type",
                    "tenant",
                    "email_verified_at",
                )
            },
        ),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "password1",
                    "password2",
                    "account_type",
                    "tenant",
                    "is_staff",
                    "is_active",
                ),
            },
        ),
    )


@admin.register(OutboundEmail)
class OutboundEmailAdmin(admin.ModelAdmin):
    list_display = (
        "subject",
        "recipient",
        "created_at",
        "sent_at",
        "attempts",
        "last_error",
    )
    list_filter = ("sent_at",)
    fields = (
        "id",
        "subject",
        "recipient",
        "created_at",
        "sent_at",
        "attempts",
        "next_attempt_at",
        "last_error",
    )
    readonly_fields = fields

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
