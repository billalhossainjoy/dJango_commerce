from typing import cast

from django.shortcuts import get_object_or_404
from rest_framework.filters import SearchFilter
from rest_framework.generics import ListAPIView, UpdateAPIView
from rest_framework.permissions import IsAuthenticated

from accounts.models import User
from accounts.permissions import IsPlatformUser
from customers.serializers import AdminCustomerSerializer
from tenancy.models import Tenant


def owned_customers(tenant_slug: str, owner: User):
    tenant = get_object_or_404(
        Tenant,
        slug=tenant_slug,
        ownership__user=owner,
    )
    return User.objects.filter(
        tenant=tenant,
        account_type=User.AccountType.CUSTOMER,
    ).order_by("-date_joined")


class AdminCustomerListView(ListAPIView):
    permission_classes = [IsAuthenticated, IsPlatformUser]
    serializer_class = AdminCustomerSerializer
    filter_backends = [SearchFilter]
    search_fields = ["email"]

    def get_queryset(self):
        owner = cast(User, self.request.user)
        return owned_customers(self.kwargs["tenant_slug"], owner)


class AdminCustomerDetailView(UpdateAPIView):
    permission_classes = [IsAuthenticated, IsPlatformUser]
    serializer_class = AdminCustomerSerializer
    http_method_names = ["patch", "options"]

    def get_queryset(self):
        owner = cast(User, self.request.user)
        return owned_customers(self.kwargs["tenant_slug"], owner)
