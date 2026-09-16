import logging

from django.contrib.auth import (
    check_password_with_timing_attack_mitigation as password_matches,
)
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from accounts.models import User
from accounts.tokens import token_pair_for
from tenancy.models import Tenant

logger = logging.getLogger(__name__)


def invalid_credentials() -> AuthenticationFailed:
    return AuthenticationFailed("Invalid email or password.", "no_active_account")


def blocked_customer() -> AuthenticationFailed:
    return AuthenticationFailed(
        "Your customer account has been blocked. Contact the store owner.",
        "account_blocked",
    )


class TenantTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        tenant = self.context["tenant"]
        email = User.objects.normalize_email(attrs["email"]).casefold()
        password = attrs["password"]
        customer = None
        owner = None
        if tenant is not None:
            customer = User.objects.filter(
                email__iexact=email,
                account_type=User.AccountType.CUSTOMER,
                tenant=tenant,
            ).first()
            owner = User.objects.filter(
                email__iexact=email,
                account_type=User.AccountType.PLATFORM,
                tenant_ownerships__tenant=tenant,
            ).first()

        customer_password_matches = password_matches(customer, password)
        owner_password_matches = password_matches(owner, password)
        customer_matches = (
            customer is not None
            and customer.is_active
            and customer_password_matches
            and tenant is not None
            and tenant.status == Tenant.Status.ACTIVE
        )
        owner_matches = owner is not None and owner.is_active and owner_password_matches

        if (
            customer is not None
            and not customer.is_active
            and customer_password_matches
            and not owner_matches
        ):
            raise blocked_customer()

        matches = [
            user
            for user, matches_password in (
                (customer, customer_matches),
                (owner, owner_matches),
            )
            if user is not None and matches_password
        ]

        if len(matches) != 1:
            if len(matches) > 1:
                logger.error(
                    "Ambiguous tenant login identities",
                    extra={"tenant_slug": tenant.slug if tenant else None},
                )
            else:
                logger.warning(
                    "Tenant login failed",
                    extra={"tenant_slug": tenant.slug if tenant else None},
                )
            raise invalid_credentials()

        user = matches[0]
        return token_pair_for(user, include_account_type=True)


class PlatformTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        email = User.objects.normalize_email(attrs["email"]).casefold()
        user = User.objects.filter(
            email__iexact=email,
            account_type=User.AccountType.PLATFORM,
        ).first()
        if (
            not password_matches(user, attrs["password"])
            or user is None
            or not user.is_active
        ):
            raise invalid_credentials()

        return token_pair_for(user, include_is_staff=True)
