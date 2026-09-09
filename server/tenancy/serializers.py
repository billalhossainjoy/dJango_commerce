import re

from django.conf import settings
from rest_framework import serializers

from tenancy.models import Tenant, TenantHostname

SUBDOMAIN_PATTERN = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$")
RESERVED_SUBDOMAINS = {"www"}


class TenantSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields: tuple[str, ...] = ("id", "slug", "name", "status")


class OwnerTenantSummarySerializer(TenantSummarySerializer):
    canonical_hostname = serializers.SerializerMethodField()

    class Meta(TenantSummarySerializer.Meta):
        fields = (*TenantSummarySerializer.Meta.fields, "canonical_hostname")

    def get_canonical_hostname(self, tenant: Tenant) -> str | None:
        return (
            tenant.hostnames.filter(
                is_canonical=True,
                is_active=True,
            )
            .values_list("hostname", flat=True)
            .first()
        )


class TenantLoginContextSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ("slug", "name")


class TenantSettingsSerializer(serializers.ModelSerializer):
    subdomain = serializers.SerializerMethodField()

    class Meta:
        model = Tenant
        fields = ("name", "slug", "subdomain")
        read_only_fields = ("subdomain",)
        extra_kwargs = {"slug": {"validators": []}}

    def get_subdomain(self, tenant: Tenant) -> str:
        return f"{tenant.slug}.{settings.PLATFORM_ROOT_DOMAIN}"

    def validate_name(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("Enter a store name.")
        return value.strip()

    def validate_slug(self, value: str) -> str:
        slug = value.casefold()
        if not SUBDOMAIN_PATTERN.fullmatch(slug) or slug in RESERVED_SUBDOMAINS:
            raise serializers.ValidationError(
                "Use letters, numbers, or hyphens and avoid reserved subdomains."
            )
        tenants = Tenant.objects.filter(slug__iexact=slug)
        if self.instance is not None:
            tenants = tenants.exclude(id=self.instance.id)
        if tenants.exists():
            raise serializers.ValidationError("This subdomain is already taken.")

        hostname = f"{slug}.{settings.PLATFORM_ROOT_DOMAIN}"
        hostnames = TenantHostname.objects.filter(hostname__iexact=hostname)
        if self.instance is not None:
            hostnames = hostnames.exclude(tenant=self.instance)
        if hostnames.exists():
            raise serializers.ValidationError("This subdomain is already taken.")
        return slug

    def update(self, tenant: Tenant, validated_data) -> Tenant:
        tenant.name = validated_data.get("name", tenant.name)
        tenant.slug = validated_data.get("slug", tenant.slug)
        tenant.save(update_fields=("name", "slug", "updated_at"))

        hostname = f"{tenant.slug}.{settings.PLATFORM_ROOT_DOMAIN}"
        subdomain = tenant.hostnames.filter(kind=TenantHostname.Kind.SUBDOMAIN).first()
        if subdomain is None:
            TenantHostname.objects.create(
                tenant=tenant,
                hostname=hostname,
                kind=TenantHostname.Kind.SUBDOMAIN,
                is_canonical=not tenant.hostnames.filter(is_canonical=True).exists(),
            )
        elif subdomain.hostname != hostname:
            subdomain.hostname = hostname
            subdomain.save(update_fields=("hostname", "updated_at"))
        return tenant
