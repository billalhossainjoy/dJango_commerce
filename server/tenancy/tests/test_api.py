import pytest
from django.test import override_settings
from django.urls import reverse

from tenancy.models import Tenant, TenantHostname


@pytest.mark.django_db
@override_settings(ALLOWED_HOSTS=[".localhost"])
def test_tenant_context_returns_only_the_hostname_tenant(client):
    demo = Tenant.objects.create(
        slug="demo",
        name="Demo Store",
        status=Tenant.Status.ACTIVE,
    )
    other = Tenant.objects.create(
        slug="other",
        name="Other Store",
        status=Tenant.Status.ACTIVE,
    )
    TenantHostname.objects.create(tenant=demo, hostname="demo.localhost")
    TenantHostname.objects.create(tenant=other, hostname="other.localhost")

    response = client.get(
        reverse("tenant-context"),
        headers={"host": "demo.localhost:3000"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": str(demo.id),
        "slug": "demo",
        "name": "Demo Store",
        "status": "active",
    }


@pytest.mark.django_db
@override_settings(ALLOWED_HOSTS=[".localhost"])
def test_tenant_context_returns_not_found_for_unknown_hostname(client):
    response = client.get(
        reverse("tenant-context"),
        headers={"host": "unknown.localhost"},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Tenant not found."}
