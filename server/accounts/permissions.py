from typing import cast

from rest_framework.permissions import BasePermission
from rest_framework.request import Request

from accounts.models import User


class IsPlatformUser(BasePermission):
    def has_permission(self, request: Request, view) -> bool:
        if not request.user.is_authenticated:
            return False
        user = cast(User, request.user)
        return user.account_type == User.AccountType.PLATFORM


class IsCustomerForTenant(BasePermission):
    def has_permission(self, request: Request, view) -> bool:
        if not request.user.is_authenticated:
            return False
        user = cast(User, request.user)
        return bool(
            user.account_type == User.AccountType.CUSTOMER
            and user.tenant is not None
            and user.tenant.slug == view.kwargs["tenant_slug"]
        )
