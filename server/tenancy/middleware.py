from collections.abc import Callable
from secrets import compare_digest
from typing import cast

from django.conf import settings
from django.http import (
    HttpRequest,
    HttpResponse,
    HttpResponseBadRequest,
    HttpResponseForbidden,
)

from tenancy.hostnames import InvalidHostname, resolve_hostname
from tenancy.models import Tenant, TenantHostname

_TENANT_RESOLUTION_EXEMPT_PATHS = {
    "/api/v1/health/",
    "/api/v1/readiness/",
}
_PROXY_HOST_HEADER = "X-Tenant-Hostname"
_PROXY_SECRET_HEADER = "X-Internal-Proxy-Secret"


class TenantRequest(HttpRequest):
    """An HTTP request carrying optional hostname-derived tenant context."""

    tenant_hostname: TenantHostname | None
    tenant: Tenant | None


class TenantResolutionMiddleware:
    """Attach hostname-derived tenant context to every request."""

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        tenant_request = cast(TenantRequest, request)
        tenant_request.tenant_hostname = None
        tenant_request.tenant = None

        if tenant_request.path_info in _TENANT_RESOLUTION_EXEMPT_PATHS:
            return self.get_response(tenant_request)

        hostname = tenant_request.headers.get(_PROXY_HOST_HEADER)
        if hostname is not None:
            supplied_secret = tenant_request.headers.get(_PROXY_SECRET_HEADER, "")
            if not settings.INTERNAL_PROXY_SECRET or not compare_digest(
                supplied_secret,
                settings.INTERNAL_PROXY_SECRET,
            ):
                return HttpResponseForbidden()
        else:
            hostname = tenant_request.get_host()

        try:
            tenant_hostname = resolve_hostname(hostname)
        except InvalidHostname:
            return HttpResponseBadRequest()

        tenant_request.tenant_hostname = tenant_hostname
        tenant_request.tenant = tenant_hostname.tenant if tenant_hostname else None

        return self.get_response(tenant_request)
