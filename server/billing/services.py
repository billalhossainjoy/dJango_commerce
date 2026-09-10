from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from urllib.parse import urlsplit, urlunsplit

import stripe
from django.conf import settings
from django.db import transaction
from stripe.params.billing_portal import (
    SessionCreateParams as PortalSessionCreateParams,
)
from stripe.params.checkout import SessionCreateParams

from accounts.models import User
from billing.models import StripeWebhookEvent, TenantSubscription
from tenancy.models import Tenant, TenantHostname


class BillingConfigurationError(Exception):
    pass


class BillingProviderError(Exception):
    pass


class SubscriptionAlreadyStarted(Exception):
    pass


class SubscriptionNotReady(Exception):
    pass


class InvalidStripeWebhook(Exception):
    pass


@dataclass(frozen=True)
class CheckoutRedirect:
    url: str


@dataclass(frozen=True)
class PortalRedirect:
    url: str


def tenant_frontend_origin(tenant: Tenant) -> str:
    configured_origin = urlsplit(settings.PLATFORM_FRONTEND_ORIGIN)
    if configured_origin.scheme not in {"http", "https"}:
        raise BillingConfigurationError

    hostname = (
        tenant.hostnames.filter(
            kind=TenantHostname.Kind.SUBDOMAIN,
            is_active=True,
        )
        .values_list("hostname", flat=True)
        .first()
    )
    if not hostname:
        raise BillingConfigurationError

    netloc = hostname
    if configured_origin.port:
        netloc = f"{hostname}:{configured_origin.port}"
    return urlunsplit((configured_origin.scheme, netloc, "", "", ""))


def stripe_client(*, checkout: bool = True) -> stripe.StripeClient:
    required_settings = (
        settings.STRIPE_SECRET_KEY,
        settings.PLATFORM_FRONTEND_ORIGIN,
    )
    checkout_is_invalid = checkout and (
        not settings.STRIPE_PRICE_ID or not 1 <= settings.STRIPE_TRIAL_DAYS <= 730
    )
    if not all(required_settings) or checkout_is_invalid:
        raise BillingConfigurationError
    return stripe.StripeClient(settings.STRIPE_SECRET_KEY)


def construct_stripe_event(payload: bytes, signature: str):
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise BillingConfigurationError
    try:
        return stripe.Webhook.construct_event(
            payload,
            signature,
            settings.STRIPE_WEBHOOK_SECRET,
        )
    except (ValueError, stripe.SignatureVerificationError) as error:
        raise InvalidStripeWebhook from error


def stripe_id(value: Any) -> str | None:
    if isinstance(value, str):
        return value
    if isinstance(value, dict) and isinstance(value.get("id"), str):
        return value["id"]
    return None


def stripe_datetime(value: Any) -> datetime | None:
    if not isinstance(value, int):
        return None
    return datetime.fromtimestamp(value, tz=UTC)


def subscription_period_end(subscription: dict[str, Any]) -> datetime | None:
    period_end = subscription.get("current_period_end")
    if not isinstance(period_end, int):
        items = subscription.get("items", {}).get("data", [])
        period_ends: list[int] = []
        for item in items:
            if not isinstance(item, dict):
                continue
            item_period_end = item.get("current_period_end")
            if isinstance(item_period_end, int):
                period_ends.append(item_period_end)
        period_end = max(period_ends, default=None)
    return stripe_datetime(period_end)


def subscription_for_event(data: dict[str, Any]) -> TenantSubscription | None:
    subscription_id = stripe_id(data.get("id"))
    tenant_id = data.get("metadata", {}).get("tenant_id")
    if isinstance(tenant_id, str):
        subscription, _ = TenantSubscription.objects.get_or_create(tenant_id=tenant_id)
        return subscription
    if subscription_id:
        return TenantSubscription.objects.filter(
            stripe_subscription_id=subscription_id
        ).first()
    return None


def sync_checkout_session(data: dict[str, Any]) -> None:
    tenant_id = data.get("metadata", {}).get("tenant_id") or data.get(
        "client_reference_id"
    )
    if not isinstance(tenant_id, str):
        return
    subscription, _ = TenantSubscription.objects.get_or_create(tenant_id=tenant_id)
    subscription.stripe_checkout_session_id = stripe_id(data.get("id"))
    subscription.stripe_customer_id = stripe_id(data.get("customer"))
    subscription.stripe_subscription_id = stripe_id(data.get("subscription"))
    subscription.save(
        update_fields=(
            "stripe_checkout_session_id",
            "stripe_customer_id",
            "stripe_subscription_id",
            "updated_at",
        )
    )


def sync_subscription(data: dict[str, Any]) -> None:
    subscription = subscription_for_event(data)
    status = data.get("status")
    if subscription is None or status not in TenantSubscription.Status.values:
        return

    subscription.stripe_subscription_id = stripe_id(data.get("id"))
    subscription.stripe_customer_id = stripe_id(data.get("customer"))
    subscription.status = status
    subscription.trial_ends_at = stripe_datetime(data.get("trial_end"))
    subscription.current_period_ends_at = subscription_period_end(data)
    subscription.cancel_at_period_end = bool(data.get("cancel_at_period_end", False))
    subscription.save(
        update_fields=(
            "stripe_subscription_id",
            "stripe_customer_id",
            "status",
            "trial_ends_at",
            "current_period_ends_at",
            "cancel_at_period_end",
            "updated_at",
        )
    )


@transaction.atomic
def process_stripe_event(event: dict[str, Any]) -> bool:
    event_id = event.get("id")
    event_type = event.get("type")
    if not isinstance(event_id, str) or not isinstance(event_type, str):
        raise InvalidStripeWebhook

    _, created = StripeWebhookEvent.objects.get_or_create(
        id=event_id,
        defaults={
            "event_type": event_type,
            "livemode": bool(event.get("livemode", False)),
        },
    )
    if not created:
        return False

    data = event.get("data", {}).get("object", {})
    if not isinstance(data, dict):
        raise InvalidStripeWebhook
    if event_type == "checkout.session.completed":
        sync_checkout_session(data)
    elif event_type in {
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
    }:
        sync_subscription(data)
    return True


@transaction.atomic
def create_checkout_session(tenant: Tenant, owner: User) -> CheckoutRedirect:
    subscription, _ = TenantSubscription.objects.select_for_update().get_or_create(
        tenant=tenant
    )
    if subscription.status in {
        TenantSubscription.Status.TRIALING,
        TenantSubscription.Status.ACTIVE,
        TenantSubscription.Status.PAST_DUE,
        TenantSubscription.Status.UNPAID,
        TenantSubscription.Status.PAUSED,
    }:
        raise SubscriptionAlreadyStarted

    client = stripe_client()
    try:
        if subscription.stripe_checkout_session_id:
            existing = client.v1.checkout.sessions.retrieve(
                subscription.stripe_checkout_session_id
            )
            if existing.status == "open" and existing.url:
                return CheckoutRedirect(existing.url)

        origin = tenant_frontend_origin(tenant)
        tenant_id = str(tenant.id)
        params: SessionCreateParams = {
            "mode": "subscription",
            "line_items": [{"price": settings.STRIPE_PRICE_ID, "quantity": 1}],
            "success_url": f"{origin}/admin/billing?checkout=success",
            "cancel_url": f"{origin}/admin/billing?checkout=cancelled",
            "client_reference_id": tenant_id,
            "metadata": {"tenant_id": tenant_id},
            "subscription_data": {
                "trial_period_days": settings.STRIPE_TRIAL_DAYS,
                "metadata": {"tenant_id": tenant_id},
            },
        }
        if subscription.stripe_customer_id:
            params["customer"] = subscription.stripe_customer_id
        else:
            params["customer_email"] = owner.email

        session = client.v1.checkout.sessions.create(params)
    except stripe.StripeError as error:
        raise BillingProviderError from error

    if not session.url:
        raise BillingProviderError
    subscription.stripe_checkout_session_id = session.id
    subscription.save(update_fields=("stripe_checkout_session_id", "updated_at"))
    return CheckoutRedirect(session.url)


def create_portal_session(tenant: Tenant) -> PortalRedirect:
    subscription = TenantSubscription.objects.filter(tenant=tenant).first()
    if subscription is None or not subscription.stripe_customer_id:
        raise SubscriptionNotReady

    params: PortalSessionCreateParams = {
        "customer": subscription.stripe_customer_id,
        "return_url": f"{tenant_frontend_origin(tenant)}/admin/billing",
    }
    try:
        session = stripe_client(checkout=False).v1.billing_portal.sessions.create(
            params
        )
    except stripe.StripeError as error:
        raise BillingProviderError from error
    if not session.url:
        raise BillingProviderError
    return PortalRedirect(session.url)
