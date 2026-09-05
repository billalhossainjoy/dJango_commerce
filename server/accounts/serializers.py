import logging

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.db.models import Q
from rest_framework import serializers
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from tenancy.models import Tenant, TenantHostname, TenantOwner

logger = logging.getLogger(__name__)


class TenantSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    slug = serializers.SlugField(read_only=True)
    name = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)


class OwnerTenantSummarySerializer(TenantSummarySerializer):
    canonical_hostname = serializers.SerializerMethodField()

    def get_canonical_hostname(self, tenant: Tenant) -> str | None:
        return (
            tenant.hostnames.filter(
                is_canonical=True,
                is_active=True,
            )
            .values_list("hostname", flat=True)
            .first()
        )


class CurrentUserSerializer(serializers.ModelSerializer):
    tenant = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "email", "account_type", "tenant")

    def get_tenant(self, user):
        ownership = user.tenant_ownerships.select_related("tenant").first()
        if ownership is None:
            return None

        return OwnerTenantSummarySerializer(ownership.tenant).data


class CustomerSerializer(serializers.ModelSerializer):
    tenant = TenantSummarySerializer(read_only=True)

    class Meta:
        model = User
        fields = ("id", "email", "account_type", "tenant")


class CustomerSignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ("id", "email", "password")
        read_only_fields = ("id",)

    def validate_email(self, value: str) -> str:
        email: str = User.objects.normalize_email(value).casefold()
        tenant = self.context["tenant"]
        email_is_taken = User.objects.filter(email__iexact=email).filter(
            Q(account_type=User.AccountType.CUSTOMER, tenant=tenant)
            | Q(
                account_type=User.AccountType.PLATFORM,
                tenant_ownerships__tenant=tenant,
            )
        )
        if email_is_taken.exists():
            raise serializers.ValidationError("An account with this email exists.")
        return email

    def validate_password(self, value: str) -> str:
        validate_password(value)
        return value

    def create(self, validated_data):
        return User.objects.create_user(
            **validated_data,
            tenant=self.context["tenant"],
            account_type=User.AccountType.CUSTOMER,
        )


def customer_refresh_token(user: User) -> RefreshToken:
    if user.account_type != User.AccountType.CUSTOMER or user.tenant is None:
        raise ValueError("Customer tokens require a tenant-scoped customer.")

    token = RefreshToken.for_user(user)
    token["account_type"] = User.AccountType.CUSTOMER
    token["tenant_id"] = str(user.tenant.id)
    token["tenant_slug"] = user.tenant.slug
    return token


class TenantTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.USERNAME_FIELD
    default_error_messages = {
        "no_active_account": "Invalid email or password.",
    }

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

        customer_matches = _password_matches(customer, password) and (
            tenant is not None and tenant.status == Tenant.Status.ACTIVE
        )
        owner_matches = _password_matches(owner, password)
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
            raise AuthenticationFailed(
                str(self.error_messages["no_active_account"]),
                "no_active_account",
            )

        user = matches[0]
        refresh = (
            customer_refresh_token(user)
            if user.account_type == User.AccountType.CUSTOMER
            else RefreshToken.for_user(user)
        )
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "account_type": user.account_type,
        }


def _password_matches(user: User | None, password: str) -> bool:
    if user is None:
        User().set_password(password)
        return False

    password_matches = user.check_password(password)
    return user.is_active and password_matches


class PlatformTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.USERNAME_FIELD
    default_error_messages = {
        "no_active_account": "Invalid email or password.",
    }

    def validate(self, attrs):
        email = User.objects.normalize_email(attrs["email"]).casefold()
        user = User.objects.filter(
            email__iexact=email,
            account_type=User.AccountType.PLATFORM,
        ).first()
        if not _password_matches(user, attrs["password"]):
            raise AuthenticationFailed(
                str(self.error_messages["no_active_account"]),
                "no_active_account",
            )

        assert user is not None
        refresh = RefreshToken.for_user(user)
        return {"refresh": str(refresh), "access": str(refresh.access_token)}


class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    store_name = serializers.CharField(max_length=120, write_only=True)
    slug = serializers.SlugField(max_length=63, write_only=True)
    tenant = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "email", "password", "store_name", "slug", "tenant")
        read_only_fields = ("id", "tenant")

    def get_tenant(self, user):
        ownership = user.tenant_ownerships.select_related("tenant").get()
        return OwnerTenantSummarySerializer(ownership.tenant).data

    def validate_slug(self, value: str) -> str:
        slug = value.lower()
        if Tenant.objects.filter(slug=slug).exists():
            raise serializers.ValidationError("This store URL is already taken.")
        return slug

    def validate_email(self, value: str) -> str:
        email: str = User.objects.normalize_email(value).casefold()
        if User.objects.filter(
            email__iexact=email,
            account_type=User.AccountType.PLATFORM,
        ).exists():
            raise serializers.ValidationError("An account with this email exists.")
        return email

    def validate_password(self, value: str) -> str:
        validate_password(value)
        return value

    def create(self, validated_data):
        store_name = validated_data.pop("store_name")
        slug = validated_data.pop("slug")

        with transaction.atomic():
            user = User.objects.create_user(
                **validated_data,
                account_type=User.AccountType.PLATFORM,
            )
            tenant = Tenant.objects.create(name=store_name, slug=slug)
            TenantOwner.objects.create(user=user, tenant=tenant)
            TenantHostname.objects.create(
                tenant=tenant,
                hostname=f"{slug}.{settings.PLATFORM_ROOT_DOMAIN}",
            )

        return user
