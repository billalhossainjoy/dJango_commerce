from django.conf import settings
from rest_framework import serializers

from billing.models import TenantSubscription


class TenantSubscriptionSerializer(serializers.ModelSerializer):
    has_access = serializers.BooleanField(read_only=True)
    billing_required = serializers.SerializerMethodField()
    trial_available = serializers.SerializerMethodField()
    can_manage = serializers.SerializerMethodField()

    class Meta:
        model = TenantSubscription
        fields = (
            "status",
            "has_access",
            "billing_required",
            "trial_available",
            "can_manage",
            "trial_ends_at",
            "current_period_ends_at",
            "cancel_at_period_end",
        )

    def get_can_manage(self, subscription: TenantSubscription) -> bool:
        return bool(subscription.stripe_customer_id)

    def get_billing_required(self, subscription: TenantSubscription) -> bool:
        return settings.STRIPE_BILLING_ENFORCED or subscription.tenant.billing_required

    def get_trial_available(self, subscription: TenantSubscription) -> bool:
        return not subscription.trial_used
