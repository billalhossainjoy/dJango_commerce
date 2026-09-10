from django.contrib import admin

from billing.models import StripeWebhookEvent, TenantSubscription


@admin.register(TenantSubscription)
class TenantSubscriptionAdmin(admin.ModelAdmin):
    list_display = (
        "tenant",
        "status",
        "trial_ends_at",
        "current_period_ends_at",
        "cancel_at_period_end",
    )
    list_filter = ("status", "cancel_at_period_end")
    search_fields = (
        "tenant__name",
        "tenant__slug",
        "stripe_customer_id",
        "stripe_subscription_id",
    )


@admin.register(StripeWebhookEvent)
class StripeWebhookEventAdmin(admin.ModelAdmin):
    list_display = ("id", "event_type", "livemode", "processed_at")
    list_filter = ("livemode", "event_type")
    search_fields = ("id", "event_type")
    readonly_fields = ("id", "event_type", "livemode", "processed_at")
