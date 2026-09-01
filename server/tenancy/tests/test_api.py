import pytest
from django.test import override_settings
from django.urls import reverse

from tenancy.models import Tenant


@pytest.mark.django_db
def test_tenant_context_returns_only_the_url_tenant(client):
    demo = Tenant.objects.create(
        slug="demo",
        name="Demo Store",
        status=Tenant.Status.ACTIVE,
    )
    Tenant.objects.create(
        slug="other",
        name="Other Store",
        status=Tenant.Status.ACTIVE,
    )
    response = client.get(
        reverse("tenant-context", kwargs={"tenant_slug": demo.slug}),
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": str(demo.id),
        "slug": "demo",
        "name": "Demo Store",
        "status": "active",
    }


@pytest.mark.django_db
def test_tenant_context_returns_not_found_for_unknown_slug(client):
    response = client.get(
        reverse("tenant-context", kwargs={"tenant_slug": "unknown"}),
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Tenant not found."}


@pytest.mark.django_db
@override_settings(
    CORS_ALLOWED_ORIGINS=[],
    CORS_ALLOWED_ORIGIN_REGEXES=[
        r"^http://(?:[a-z0-9]|[a-z0-9][a-z0-9-]*[a-z0-9])\.localhost:3000$"
    ],
)
def test_tenant_api_allows_only_configured_frontend_origin(client):
    tenant = Tenant.objects.create(
        slug="demo",
        name="Demo Store",
        status=Tenant.Status.ACTIVE,
    )
    url = reverse("tenant-context", kwargs={"tenant_slug": tenant.slug})

    allowed_response = client.get(
        url,
        headers={"origin": "http://demo.localhost:3000"},
    )
    blocked_response = client.get(
        url,
        headers={"origin": "https://attacker.example"},
    )

    assert allowed_response["access-control-allow-origin"] == (
        "http://demo.localhost:3000"
    )
    assert "access-control-allow-origin" not in blocked_response
