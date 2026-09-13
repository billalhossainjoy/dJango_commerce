from django.db.models import Count, Q, Sum
from rest_framework.generics import ListAPIView, RetrieveAPIView, UpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsPlatformAdmin
from billing.models import SubscriptionPayment, TenantSubscription
from platform_admin.serializers import (
    PlatformOverviewSerializer,
    PlatformPaymentSerializer,
    PlatformTenantSerializer,
    PlatformTenantStatusSerializer,
)
from tenancy.models import Tenant


class PlatformOverviewView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request: Request) -> Response:
        tenants = Tenant.objects.aggregate(
            total=Count("id"),
            provisioning=Count("id", filter=Q(status=Tenant.Status.PROVISIONING)),
            active=Count("id", filter=Q(status=Tenant.Status.ACTIVE)),
            suspended=Count("id", filter=Q(status=Tenant.Status.SUSPENDED)),
            closed=Count("id", filter=Q(status=Tenant.Status.CLOSED)),
            billing_required=Count("id", filter=Q(billing_required=True)),
        )
        subscriptions = TenantSubscription.objects.aggregate(
            total=Count("id"),
            trialing=Count("id", filter=Q(status=TenantSubscription.Status.TRIALING)),
            active=Count("id", filter=Q(status=TenantSubscription.Status.ACTIVE)),
            past_due=Count("id", filter=Q(status=TenantSubscription.Status.PAST_DUE)),
            canceled=Count("id", filter=Q(status=TenantSubscription.Status.CANCELED)),
        )
        payment_counts = SubscriptionPayment.objects.aggregate(
            paid=Count("id", filter=Q(status=SubscriptionPayment.Status.PAID)),
            failed=Count("id", filter=Q(status=SubscriptionPayment.Status.FAILED)),
        )
        collected = list(
            SubscriptionPayment.objects.filter(status=SubscriptionPayment.Status.PAID)
            .values("currency")
            .annotate(amount_cents=Sum("amount_paid_cents"))
            .order_by("currency")
        )
        serializer = PlatformOverviewSerializer(
            {
                "tenants": tenants,
                "subscriptions": subscriptions,
                "payments": {**payment_counts, "collected": collected},
            }
        )
        return Response(serializer.data)


class PlatformPaymentListView(ListAPIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]
    serializer_class = PlatformPaymentSerializer

    def get_queryset(self):
        return SubscriptionPayment.objects.select_related("tenant").order_by(
            "-created_at"
        )


def platform_tenants():
    return (
        Tenant.objects.select_related("ownership__user", "subscription")
        .annotate(
            customer_count=Count(
                "users",
                filter=Q(users__account_type=User.AccountType.CUSTOMER),
                distinct=True,
            ),
            product_count=Count("products", distinct=True),
            order_count=Count("orders", distinct=True),
        )
        .order_by("-created_at")
    )


class PlatformTenantListView(ListAPIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]
    serializer_class = PlatformTenantSerializer

    def get_queryset(self):
        return platform_tenants()


class PlatformTenantDetailView(RetrieveAPIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]
    serializer_class = PlatformTenantSerializer

    def get_queryset(self):
        return platform_tenants()


class PlatformTenantStatusView(UpdateAPIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]
    serializer_class = PlatformTenantStatusSerializer
    http_method_names = ["patch", "options"]

    def get_queryset(self):
        return Tenant.objects.all()
