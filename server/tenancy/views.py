from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response

from tenancy.models import Tenant


@api_view(["GET"])
def tenant_context(request: Request, tenant_slug: str) -> Response:
    """Return public context for an active tenant selected by its URL slug."""
    tenant = Tenant.objects.filter(
        slug=tenant_slug,
        status=Tenant.Status.ACTIVE,
    ).first()
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
