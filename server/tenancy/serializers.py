from rest_framework import serializers

from tenancy.models import Tenant


class TenantSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ("id", "slug", "name", "status")


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
