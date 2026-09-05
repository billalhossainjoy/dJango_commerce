import logging

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
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
        if User.objects.filter(
            email__iexact=email,
            account_type=User.AccountType.CUSTOMER,
            tenant=tenant,
        ).exists():
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


class CustomerTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.USERNAME_FIELD
    default_error_messages = {
        "no_active_account": "Invalid email or password.",
    }

    def validate(self, attrs):
        tenant = self.context["tenant"]
        email = User.objects.normalize_email(attrs["email"]).casefold()
        password = attrs["password"]
        user = User.objects.filter(
            email__iexact=email,
            account_type=User.AccountType.CUSTOMER,
            tenant=tenant,
        ).first()

        if user is None:
            User().set_password(password)

        if user is None or not user.check_password(password) or not user.is_active:
            logger.warning("Customer login failed", extra={"tenant_slug": tenant.slug})
            raise AuthenticationFailed(
                str(self.error_messages["no_active_account"]),
                "no_active_account",
            )

        refresh = customer_refresh_token(user)
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
