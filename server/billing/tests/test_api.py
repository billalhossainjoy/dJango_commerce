from types import SimpleNamespace

import pytest
from django.urls import reverse
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from billing.models import StripeWebhookEvent, TenantSubscription
from billing.services import CheckoutRedirect, InvalidStripeWebhook, PortalRedirect
from tenancy.models import Tenant, TenantOwner


def authorization_for(user: User) -> dict[str, str]:
    access_token = str(RefreshToken.for_user(user).access_token)
    return {"authorization": f"Bearer {access_token}"}


@pytest.mark.django_db
def test_tenant_owner_starts_subscription_checkout(client, monkeypatch):
    owner = User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )
    tenant = Tenant.objects.create(slug="demo", name="Demo Store")
    TenantOwner.objects.create(user=owner, tenant=tenant)
    calls = SimpleNamespace(tenant=None, owner=None)

    def fake_checkout(requested_tenant, requested_owner):
        calls.tenant = requested_tenant
        calls.owner = requested_owner
        return CheckoutRedirect("https://checkout.stripe.com/c/pay/test")

    monkeypatch.setattr("billing.views.create_checkout_session", fake_checkout)

    response = client.post(
        reverse("subscription-checkout", kwargs={"tenant_slug": tenant.slug}),
        headers=authorization_for(owner),
    )

    assert response.status_code == 200
    assert response.json() == {"checkout_url": "https://checkout.stripe.com/c/pay/test"}
    assert calls.tenant == tenant
    assert calls.owner == owner


@pytest.mark.django_db
def test_tenant_owner_gets_default_subscription_status(client):
    owner = User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )
    tenant = Tenant.objects.create(slug="demo", name="Demo Store")
    TenantOwner.objects.create(user=owner, tenant=tenant)

    response = client.get(
        reverse("subscription-detail", kwargs={"tenant_slug": tenant.slug}),
        headers=authorization_for(owner),
    )

    assert response.status_code == 200
    assert response.json() == {
        "status": "not_started",
        "has_access": False,
        "can_manage": False,
        "trial_ends_at": None,
        "current_period_ends_at": None,
        "cancel_at_period_end": False,
    }


@pytest.mark.django_db
def test_tenant_owner_opens_customer_portal(client, monkeypatch):
    owner = User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )
    tenant = Tenant.objects.create(slug="demo", name="Demo Store")
    TenantOwner.objects.create(user=owner, tenant=tenant)
    TenantSubscription.objects.create(
        tenant=tenant,
        stripe_customer_id="cus_123",
        status=TenantSubscription.Status.TRIALING,
    )
    monkeypatch.setattr(
        "billing.views.create_portal_session",
        lambda requested_tenant: PortalRedirect(
            "https://billing.stripe.com/p/session/test"
        ),
    )

    response = client.post(
        reverse("subscription-portal", kwargs={"tenant_slug": tenant.slug}),
        headers=authorization_for(owner),
    )

    assert response.status_code == 200
    assert response.json() == {
        "portal_url": "https://billing.stripe.com/p/session/test"
    }


@pytest.mark.django_db
def test_tenant_owner_cannot_start_checkout_for_another_store(client, monkeypatch):
    owner = User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )
    owned_tenant = Tenant.objects.create(slug="owned", name="Owned Store")
    other_tenant = Tenant.objects.create(slug="other", name="Other Store")
    TenantOwner.objects.create(user=owner, tenant=owned_tenant)
    monkeypatch.setattr(
        "billing.views.create_checkout_session",
        lambda *_: pytest.fail("Checkout must not be created."),
    )

    response = client.post(
        reverse(
            "subscription-checkout",
            kwargs={"tenant_slug": other_tenant.slug},
        ),
        headers=authorization_for(owner),
    )

    assert response.status_code == 404


@pytest.mark.django_db
def test_checkout_returns_service_unavailable_when_stripe_is_not_configured(client):
    owner = User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )
    tenant = Tenant.objects.create(slug="demo", name="Demo Store")
    TenantOwner.objects.create(user=owner, tenant=tenant)

    response = client.post(
        reverse("subscription-checkout", kwargs={"tenant_slug": tenant.slug}),
        headers=authorization_for(owner),
    )

    assert response.status_code == 503
    assert response.json() == {"detail": "Subscription billing is not configured."}


@pytest.mark.django_db
def test_subscription_webhook_updates_billing_state_once(client, monkeypatch):
    tenant = Tenant.objects.create(slug="demo", name="Demo Store")
    event = {
        "id": "evt_subscription_updated",
        "type": "customer.subscription.updated",
        "livemode": False,
        "data": {
            "object": {
                "id": "sub_123",
                "customer": "cus_123",
                "status": "trialing",
                "trial_end": 1_800_000_000,
                "cancel_at_period_end": False,
                "metadata": {"tenant_id": str(tenant.id)},
                "items": {"data": [{"current_period_end": 1_800_086_400}]},
            }
        },
    }
    monkeypatch.setattr("billing.views.construct_stripe_event", lambda *_: event)
    url = reverse("stripe-webhook")

    first = client.post(
        url,
        data=b"{}",
        content_type="application/json",
        headers={"stripe-signature": "test-signature"},
    )
    duplicate = client.post(
        url,
        data=b"{}",
        content_type="application/json",
        headers={"stripe-signature": "test-signature"},
    )

    assert first.status_code == 200
    assert duplicate.status_code == 200
    subscription = TenantSubscription.objects.get(tenant=tenant)
    assert subscription.status == TenantSubscription.Status.TRIALING
    assert subscription.stripe_customer_id == "cus_123"
    assert subscription.stripe_subscription_id == "sub_123"
    assert subscription.trial_ends_at is not None
    assert subscription.current_period_ends_at is not None
    assert subscription.trial_ends_at.timestamp() == 1_800_000_000
    assert subscription.current_period_ends_at.timestamp() == 1_800_086_400
    assert StripeWebhookEvent.objects.filter(id=event["id"]).count() == 1


@pytest.mark.django_db
def test_checkout_webhook_connects_stripe_ids_to_tenant(client, monkeypatch):
    tenant = Tenant.objects.create(slug="demo", name="Demo Store")
    event = {
        "id": "evt_checkout_completed",
        "type": "checkout.session.completed",
        "livemode": False,
        "data": {
            "object": {
                "id": "cs_123",
                "customer": "cus_123",
                "subscription": "sub_123",
                "client_reference_id": str(tenant.id),
                "metadata": {"tenant_id": str(tenant.id)},
            }
        },
    }
    monkeypatch.setattr("billing.views.construct_stripe_event", lambda *_: event)

    response = client.post(
        reverse("stripe-webhook"),
        data=b"{}",
        content_type="application/json",
        headers={"stripe-signature": "test-signature"},
    )

    assert response.status_code == 200
    subscription = TenantSubscription.objects.get(tenant=tenant)
    assert subscription.stripe_checkout_session_id == "cs_123"
    assert subscription.stripe_customer_id == "cus_123"
    assert subscription.stripe_subscription_id == "sub_123"


@pytest.mark.django_db
def test_webhook_rejects_invalid_stripe_signature(client, monkeypatch):
    def reject_webhook(*_):
        raise InvalidStripeWebhook

    monkeypatch.setattr("billing.views.construct_stripe_event", reject_webhook)

    response = client.post(
        reverse("stripe-webhook"),
        data=b"{}",
        content_type="application/json",
        headers={"stripe-signature": "invalid"},
    )

    assert response.status_code == 400
    assert StripeWebhookEvent.objects.count() == 0
