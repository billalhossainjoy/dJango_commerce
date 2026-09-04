from typing import Any, cast

from django.http import Http404
from rest_framework.generics import (
    ListAPIView,
    ListCreateAPIView,
    RetrieveUpdateDestroyAPIView,
)
from rest_framework.permissions import IsAuthenticated

from accounts.models import User
from catalog.models import Product
from catalog.serializers import ProductSerializer
from tenancy.models import Tenant


class OwnedTenantMixin:
    request: Any
    kwargs: dict[str, str]

    def get_tenant(self) -> Tenant:
        user = cast(User, self.request.user)
        tenant = Tenant.objects.filter(
            slug=self.kwargs["tenant_slug"],
            ownership__user=user,
        ).first()
        if tenant is None:
            raise Http404
        return tenant


class PublicProductListView(ListAPIView):
    serializer_class = ProductSerializer

    def get_queryset(self):
        return Product.objects.filter(
            tenant__slug=self.kwargs["tenant_slug"],
            tenant__status=Tenant.Status.ACTIVE,
            is_active=True,
        )


class AdminProductListCreateView(OwnedTenantMixin, ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ProductSerializer

    def get_queryset(self):
        return Product.objects.filter(tenant=self.get_tenant())

    def perform_create(self, serializer):
        serializer.save(tenant=self.get_tenant())


class AdminProductDetailView(OwnedTenantMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ProductSerializer

    def get_queryset(self):
        return Product.objects.filter(tenant=self.get_tenant())
