import pytest

from tenancy.hostnames import InvalidHostname, normalize_hostname, resolve_hostname
from tenancy.models import Tenant, TenantHostname


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("demo.localhost", "demo.localhost"),
        ("DEMO.LOCALHOST", "demo.localhost"),
        ("demo.localhost:3000", "demo.localhost"),
        ("demo.localhost.", "demo.localhost"),
    ],
)
def test_normalize_hostname(value, expected):
    assert normalize_hostname(value) == expected


@pytest.mark.parametrize(
    "value",
    [
        "",
        " demo.localhost",
        "demo.localhost ",
        "demo.localhost:http",
        ":3000",
        "https://demo.localhost",
        "demo..localhost",
        "127.0.0.1",
        "[::1]:8000",
    ],
)
def test_normalize_hostname_rejects_invalid_input(value):
    with pytest.raises(InvalidHostname):
        normalize_hostname(value)


@pytest.mark.django_db
def test_resolve_hostname_returns_the_active_tenant_hostname():
    tenant = Tenant.objects.create(
        slug="demo",
        name="Demo Store",
        status=Tenant.Status.ACTIVE,
    )
    tenant_hostname = TenantHostname.objects.create(
        tenant=tenant,
        hostname="demo.localhost",
    )

    result = resolve_hostname("DEMO.LOCALHOST:3000")

    assert result == tenant_hostname
    assert result.tenant == tenant


@pytest.mark.django_db
def test_resolve_hostname_fails_closed_for_inactive_and_unknown_hosts():
    tenant = Tenant.objects.create(slug="demo")
    TenantHostname.objects.create(
        tenant=tenant,
        hostname="demo.localhost",
        is_active=False,
    )

    assert resolve_hostname("demo.localhost") is None
    assert resolve_hostname("unknown.localhost") is None
