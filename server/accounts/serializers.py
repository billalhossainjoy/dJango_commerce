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
from tenancy.serializers import OwnerTenantSummarySerializer, TenantSummarySerializer

logger = logging.getLogger(__name__)


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
        fields = ("id", "name", "email", "account_type", "tenant")


def validate_customer_email(
    value: str,
    *,
    tenant: Tenant,
    exclude_user: User | None = None,
) -> str:
    email: str = User.objects.normalize_email(value).casefold()
    users = User.objects.filter(email__iexact=email).filter(
        Q(account_type=User.AccountType.CUSTOMER, tenant=tenant)
        | Q(
            account_type=User.AccountType.PLATFORM,
            tenant_ownerships__tenant=tenant,
        )
    )
    if exclude_user is not None:
        users = users.exclude(id=exclude_user.id)
    if users.exists():
        raise serializers.ValidationError("An account with this email exists.")
    return email


class CustomerSignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ("id", "email", "password")
        read_only_fields = ("id",)

    def validate_email(self, value: str) -> str:
        return validate_customer_email(value, tenant=self.context["tenant"])

    def validate_password(self, value: str) -> str:
        validate_password(value)
        return value

    def create(self, validated_data):
        return User.objects.create_user(
            **validated_data,
            tenant=self.context["tenant"],
            account_type=User.AccountType.CUSTOMER,
        )


class CustomerProfileSerializer(serializers.ModelSerializer):
    name = serializers.CharField(max_length=120)

    class Meta:
        model = User
        fields = ("name", "email")

    def validate_email(self, value: str) -> str:
        user = self.instance
        assert isinstance(user, User) and user.tenant is not None
        return validate_customer_email(
            value,
            tenant=user.tenant,
            exclude_user=user,
        )


class CustomerPasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_current_password(self, value: str) -> str:
        if not self.context["user"].check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate_new_password(self, value: str) -> str:
        validate_password(value, self.context["user"])
        return value

    def save(self) -> User:
        user = self.context["user"]
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user


def refresh_token_for(user: User) -> RefreshToken:
    token = RefreshToken.for_user(user)
    if user.account_type == User.AccountType.CUSTOMER:
        if user.tenant is None:
            raise ValueError("Customer tokens require a tenant.")
        token["account_type"] = User.AccountType.CUSTOMER
        token["tenant_id"] = str(user.tenant.id)
        token["tenant_slug"] = user.tenant.slug
    return token


def token_pair_for(user: User, *, include_account_type: bool = False):
    refresh = refresh_token_for(user)
    data = {"refresh": str(refresh), "access": str(refresh.access_token)}
    if include_account_type:
        data["account_type"] = user.account_type
    return data


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

        customer_password_matches = _password_matches(customer, password)
        owner_password_matches = _password_matches(owner, password)
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


def _password_matches(user: User | None, password: str) -> bool:
    if user is None:
        User().set_password(password)
        return False

    return user.check_password(password)


class PlatformTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        email = User.objects.normalize_email(attrs["email"]).casefold()
        user = User.objects.filter(
            email__iexact=email,
            account_type=User.AccountType.PLATFORM,
        ).first()
        if (
            user is None
            or not user.is_active
            or not _password_matches(user, attrs["password"])
        ):
            raise invalid_credentials()

        assert user is not None
        return token_pair_for(user)


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
