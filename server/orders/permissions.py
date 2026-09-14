from rest_framework.permissions import BasePermission
from rest_framework.request import Request

from accounts.models import User


class IsGuestOrTenantCustomer(BasePermission):
    def has_permission(self, request: Request, view) -> bool:
        if not request.user.is_authenticated:
            return True
        user = request.user
        tenant = user.tenant
        return bool(
            user.account_type == User.AccountType.CUSTOMER
            and tenant is not None
            and tenant.slug == view.kwargs["tenant_slug"]
        )
