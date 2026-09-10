from django.conf import settings

from billing.models import TenantSubscription
from tenancy.models import Tenant

BILLING_ACCESS_STATUSES = {
    TenantSubscription.Status.TRIALING,
    TenantSubscription.Status.ACTIVE,
}


def tenant_has_billing_access(tenant: Tenant) -> bool:
    if not settings.STRIPE_BILLING_ENFORCED:
        return True

    return TenantSubscription.objects.filter(
        tenant=tenant,
        status__in=BILLING_ACCESS_STATUSES,
    ).exists()
