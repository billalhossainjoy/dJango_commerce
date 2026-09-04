from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers

from accounts.models import User
from tenancy.models import Tenant, TenantHostname, TenantOwner


class TenantSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    slug = serializers.SlugField(read_only=True)
    name = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)


class CurrentUserSerializer(serializers.ModelSerializer):
    tenant = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "email", "account_type", "tenant")

    def get_tenant(self, user):
        ownership = user.tenant_ownerships.select_related("tenant").first()
        if ownership is None:
            return None

        return TenantSummarySerializer(ownership.tenant).data


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
        return TenantSummarySerializer(ownership.tenant).data

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
