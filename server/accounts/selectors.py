from django.db.models import Q
from rest_framework.exceptions import NotFound

from accounts.models import User
from billing.access import tenant_has_billing_access
from tenancy.models import Tenant


def active_tenant(tenant_slug: str) -> Tenant:
    tenant = Tenant.objects.filter(slug=tenant_slug).first()
    if tenant is None:
        raise NotFound("Store not found. Check the store address and try again.")
    if not tenant_has_billing_access(tenant):
        raise NotFound(
            "This store is currently unavailable. Please contact the store owner."
        )
    if tenant.status == Tenant.Status.PROVISIONING:
        raise NotFound(
            "This store is not open yet. The store owner must activate it "
            "from their dashboard before customers can sign up or log in."
        )
    if tenant.status != Tenant.Status.ACTIVE:
        raise NotFound(
            "This store is currently unavailable. Please contact the store owner."
        )
    return tenant


def scoped_users(tenant_slug: str | None):
    users = User.objects.filter(is_active=True)
    if tenant_slug is None:
        return users.filter(account_type=User.AccountType.PLATFORM)
    return users.filter(
        Q(account_type=User.AccountType.CUSTOMER, tenant__slug=tenant_slug)
        | Q(
            account_type=User.AccountType.PLATFORM,
            tenant_ownerships__tenant__slug=tenant_slug,
        )
    ).distinct()
