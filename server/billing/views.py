from typing import cast

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsPlatformUser
from billing.models import TenantSubscription
from billing.serializers import TenantSubscriptionSerializer
from billing.services import (
    BillingConfigurationError,
    BillingProviderError,
    InvalidStripeWebhook,
    SubscriptionAlreadyStarted,
    SubscriptionNotReady,
    construct_stripe_event,
    create_checkout_session,
    create_portal_session,
    process_stripe_event,
)
from tenancy.models import Tenant


class BillingUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "Subscription billing is not configured."


class BillingProviderUnavailable(APIException):
    status_code = status.HTTP_502_BAD_GATEWAY
    default_detail = "Stripe could not start checkout. Please try again."


class ExistingSubscription(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "This store already has a subscription."


class SubscriptionUnavailable(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Complete subscription checkout before managing billing."


def owned_tenant(request: Request, tenant_slug: str) -> Tenant:
    return get_object_or_404(
        Tenant,
        slug=tenant_slug,
        ownership__user=cast(User, request.user),
    )


class SubscriptionDetailView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformUser]

    def get(self, request: Request, tenant_slug: str) -> Response:
        subscription, _ = TenantSubscription.objects.get_or_create(
            tenant=owned_tenant(request, tenant_slug)
        )
        return Response(TenantSubscriptionSerializer(subscription).data)


class SubscriptionCheckoutView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformUser]

    def post(self, request: Request, tenant_slug: str) -> Response:
        owner = cast(User, request.user)
        tenant = owned_tenant(request, tenant_slug)
        try:
            checkout = create_checkout_session(tenant, owner)
        except BillingConfigurationError as error:
            raise BillingUnavailable from error
        except BillingProviderError as error:
            raise BillingProviderUnavailable from error
        except SubscriptionAlreadyStarted as error:
            raise ExistingSubscription from error
        return Response({"checkout_url": checkout.url})


class SubscriptionPortalView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformUser]

    def post(self, request: Request, tenant_slug: str) -> Response:
        try:
            portal = create_portal_session(owned_tenant(request, tenant_slug))
        except BillingConfigurationError as error:
            raise BillingUnavailable from error
        except BillingProviderError as error:
            raise BillingProviderUnavailable from error
        except SubscriptionNotReady as error:
            raise SubscriptionUnavailable from error
        return Response({"portal_url": portal.url})


@csrf_exempt
@require_POST
def stripe_webhook(request) -> HttpResponse:
    try:
        event = construct_stripe_event(
            request.body,
            request.headers.get("Stripe-Signature", ""),
        )
        process_stripe_event(dict(event))
    except InvalidStripeWebhook:
        return HttpResponse(status=400)
    except BillingConfigurationError:
        return HttpResponse(status=503)
    return HttpResponse(status=200)
