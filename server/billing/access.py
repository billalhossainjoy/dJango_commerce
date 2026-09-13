from django.conf import settings

from billing.models import TenantSubscription
from tenancy.models import Tenant

BILLING_ACCESS_STATUSES = {
    TenantSubscription.Status.TRIALING,
    TenantSubscription.Status.ACTIVE,
}


def tenant_has_subscription_access(tenant: Tenant) -> bool:
    return TenantSubscription.objects.filter(
        tenant=tenant,
        status__in=BILLING_ACCESS_STATUSES,
    ).exists()


def tenant_has_billing_access(tenant: Tenant) -> bool:
    if not settings.STRIPE_BILLING_ENFORCED and not tenant.billing_required:
        return True
    return tenant_has_subscription_access(tenant)
