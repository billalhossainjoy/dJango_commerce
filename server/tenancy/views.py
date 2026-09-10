from typing import cast

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from accounts.models import User
from accounts.permissions import IsPlatformUser
from billing.access import tenant_has_billing_access
from tenancy.models import Tenant
from tenancy.serializers import (
    TenantLoginContextSerializer,
    TenantSettingsSerializer,
    TenantSummarySerializer,
)


@api_view(["GET"])
def tenant_context(request: Request, tenant_slug: str) -> Response:
    """Return public context for an active tenant selected by its URL slug."""
    tenant = Tenant.objects.filter(
        slug=tenant_slug,
        status=Tenant.Status.ACTIVE,
    ).first()
    if tenant is None or not tenant_has_billing_access(tenant):
        return Response({"detail": "Tenant not found."}, status=404)

    return Response(TenantSummarySerializer(tenant).data)


@api_view(["GET"])
def owner_login_context(request: Request, tenant_slug: str) -> Response:
    """Return the minimal public tenant identity needed by owner login."""
    tenant = Tenant.objects.filter(slug=tenant_slug).only("slug", "name").first()
    if tenant is None:
        return Response({"detail": "Tenant not found."}, status=404)

    return Response(TenantLoginContextSerializer(tenant).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def activate_tenant(request: Request, tenant_slug: str) -> Response:
    """Activate a provisioning tenant owned by the authenticated user."""
    user = cast(User, request.user)
    tenant = Tenant.objects.filter(
        slug=tenant_slug,
        ownership__user=user,
    ).first()
    if tenant is None:
        return Response({"detail": "Tenant not found."}, status=404)

    if not tenant_has_billing_access(tenant):
        return Response(
            {"detail": "Start a trial or subscription before activating this store."},
            status=409,
        )

    if tenant.status in {Tenant.Status.SUSPENDED, Tenant.Status.CLOSED}:
        return Response(
            {"detail": "This store cannot be activated."},
            status=409,
        )

    if tenant.status == Tenant.Status.PROVISIONING:
        tenant.status = Tenant.Status.ACTIVE
        tenant.save(update_fields=["status", "updated_at"])

    return Response(TenantSummarySerializer(tenant).data)


class TenantSettingsView(RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated, IsPlatformUser]
    serializer_class = TenantSettingsSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self) -> Tenant:
        return get_object_or_404(
            Tenant,
            slug=self.kwargs["tenant_slug"],
            ownership__user=cast(User, self.request.user),
        )

    @transaction.atomic
    def perform_update(self, serializer) -> None:
        serializer.save()
