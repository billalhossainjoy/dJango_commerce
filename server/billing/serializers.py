from rest_framework import serializers

from billing.models import TenantSubscription


class TenantSubscriptionSerializer(serializers.ModelSerializer):
    has_access = serializers.BooleanField(read_only=True)
    can_manage = serializers.SerializerMethodField()

    class Meta:
        model = TenantSubscription
        fields = (
            "status",
            "has_access",
            "can_manage",
            "trial_ends_at",
            "current_period_ends_at",
            "cancel_at_period_end",
        )

    def get_can_manage(self, subscription: TenantSubscription) -> bool:
        return bool(subscription.stripe_customer_id)
