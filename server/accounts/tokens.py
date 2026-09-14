from typing import Any

from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.utils import get_md5_hash_password

from accounts.models import User


def refresh_token_for(user: User) -> RefreshToken:
    token = RefreshToken.for_user(user)
    if user.account_type == User.AccountType.CUSTOMER:
        if user.tenant is None:
            raise ValueError("Customer tokens require a tenant.")
        token["account_type"] = User.AccountType.CUSTOMER
        token["tenant_id"] = str(user.tenant.id)
        token["tenant_slug"] = user.tenant.slug
    return token


def token_pair_for(
    user: User,
    *,
    include_account_type: bool = False,
    include_is_staff: bool = False,
) -> dict[str, Any]:
    if user.email_verification_required and user.email_verified_at is None:
        raise AuthenticationFailed(
            "Verify your email address before signing in. You can request a new verification email below.",
            "email_verification_required",
        )
    refresh = refresh_token_for(user)
    data: dict[str, Any] = {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }
    if include_account_type:
        data["account_type"] = user.account_type
    if include_is_staff:
        data["is_staff"] = user.is_staff
    return data


def refresh_allowed(user: User, token: RefreshToken) -> bool:
    return token.get("hash_password") == get_md5_hash_password(user.password) and not (
        user.email_verification_required and user.email_verified_at is None
    )
