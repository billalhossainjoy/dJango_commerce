import pytest
from django.http import HttpResponse
from django.test import RequestFactory, override_settings

from tenancy.middleware import TenantResolutionMiddleware
from tenancy.models import Tenant, TenantHostname


@pytest.mark.django_db
@override_settings(ALLOWED_HOSTS=[".localhost"])
def test_middleware_attaches_tenant_from_active_hostname():
    tenant = Tenant.objects.create(slug="demo", status=Tenant.Status.ACTIVE)
    tenant_hostname = TenantHostname.objects.create(
        tenant=tenant,
        hostname="demo.localhost",
    )
    request = RequestFactory().get("/", headers={"host": "demo.localhost:3000"})

    def get_response(request):
        assert request.tenant == tenant
        assert request.tenant_hostname == tenant_hostname
        return HttpResponse()

    response = TenantResolutionMiddleware(get_response)(request)

    assert response.status_code == 200


@pytest.mark.django_db
@override_settings(ALLOWED_HOSTS=[".localhost"])
def test_middleware_leaves_tenant_empty_for_unknown_hostname():
    request = RequestFactory().get("/", headers={"host": "unknown.localhost"})

    def get_response(request):
        assert request.tenant is None
        assert request.tenant_hostname is None
        return HttpResponse()

    response = TenantResolutionMiddleware(get_response)(request)

    assert response.status_code == 200
