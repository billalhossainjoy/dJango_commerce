from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response

from tenancy.models import Tenant


@api_view(["GET"])
def tenant_context(request: Request) -> Response:
    """Return public context for the hostname-derived tenant."""
    tenant: Tenant | None = getattr(request, "tenant", None)
    if tenant is None:
        return Response({"detail": "Tenant not found."}, status=404)

    return Response(
        {
            "id": str(tenant.id),
            "slug": tenant.slug,
            "name": tenant.name,
            "status": tenant.status,
        }
    )
