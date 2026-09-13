from rest_framework import serializers

from billing.models import SubscriptionPayment, TenantSubscription
from tenancy.models import Tenant


class TenantTotalsSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    provisioning = serializers.IntegerField()
    active = serializers.IntegerField()
    suspended = serializers.IntegerField()
    closed = serializers.IntegerField()
    billing_required = serializers.IntegerField()


class SubscriptionTotalsSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    trialing = serializers.IntegerField()
    active = serializers.IntegerField()
    past_due = serializers.IntegerField()
    canceled = serializers.IntegerField()


class CollectedAmountSerializer(serializers.Serializer):
    currency = serializers.CharField()
    amount_cents = serializers.IntegerField()


class PaymentTotalsSerializer(serializers.Serializer):
    paid = serializers.IntegerField()
    failed = serializers.IntegerField()
    collected = CollectedAmountSerializer(many=True)


class PlatformOverviewSerializer(serializers.Serializer):
    tenants = TenantTotalsSerializer()
    subscriptions = SubscriptionTotalsSerializer()
    payments = PaymentTotalsSerializer()


class PlatformPaymentSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source="tenant.name", read_only=True)
    tenant_slug = serializers.CharField(source="tenant.slug", read_only=True)

    class Meta:
        model = SubscriptionPayment
        fields = (
            "id",
            "tenant_name",
            "tenant_slug",
            "stripe_invoice_id",
            "stripe_customer_id",
            "status",
            "currency",
            "amount_due_cents",
            "amount_paid_cents",
            "paid_at",
            "created_at",
        )


class PlatformTenantSerializer(serializers.ModelSerializer):
    owner_email = serializers.EmailField(source="ownership.user.email", read_only=True)
    subscription_status = serializers.SerializerMethodField()
    customer_count = serializers.IntegerField(read_only=True)
    product_count = serializers.IntegerField(read_only=True)
    order_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Tenant
        fields = (
            "id",
            "name",
            "slug",
            "status",
            "billing_required",
            "owner_email",
            "subscription_status",
            "customer_count",
            "product_count",
            "order_count",
            "created_at",
        )

    def get_subscription_status(self, tenant: Tenant) -> str:
        try:
            return tenant.subscription.status
        except TenantSubscription.DoesNotExist:
            return "not_started"


class PlatformTenantStatusSerializer(serializers.ModelSerializer):
    transitions = {
        Tenant.Status.ACTIVE: Tenant.Status.SUSPENDED,
        Tenant.Status.SUSPENDED: Tenant.Status.ACTIVE,
    }

    class Meta:
        model = Tenant
        fields = ("status",)

    def validate_status(self, value: str) -> str:
        tenant = self.instance
        if tenant is None or value == tenant.status:
            return value
        if self.transitions.get(tenant.status) != value:
            raise serializers.ValidationError(
                "Only active tenants can be blocked and suspended tenants unblocked."
            )
        return value
