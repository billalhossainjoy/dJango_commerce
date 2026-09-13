import pytest
from django.urls import reverse
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from billing.models import SubscriptionPayment, TenantSubscription
from tenancy.models import Tenant, TenantOwner


def authorization_for(user: User) -> dict[str, str]:
    access_token = str(RefreshToken.for_user(user).access_token)
    return {"authorization": f"Bearer {access_token}"}


@pytest.mark.django_db
def test_platform_admin_views_overview_totals(client):
    admin = User.objects.create_superuser(
        email="admin@example.com",
        password="strong-test-password-123",
    )
    active = Tenant.objects.create(
        slug="active",
        name="Active Store",
        status=Tenant.Status.ACTIVE,
        billing_required=True,
    )
    Tenant.objects.create(slug="new", name="New Store")
    TenantSubscription.objects.create(
        tenant=active,
        status=TenantSubscription.Status.TRIALING,
    )
    SubscriptionPayment.objects.create(
        tenant=active,
        stripe_invoice_id="in_paid",
        stripe_customer_id="cus_123",
        status=SubscriptionPayment.Status.PAID,
        currency="usd",
        amount_due_cents=2500,
        amount_paid_cents=2500,
    )
    SubscriptionPayment.objects.create(
        tenant=active,
        stripe_invoice_id="in_failed",
        stripe_customer_id="cus_123",
        status=SubscriptionPayment.Status.FAILED,
        currency="usd",
        amount_due_cents=2500,
    )

    response = client.get(
        reverse("platform-overview"),
        headers=authorization_for(admin),
    )

    assert response.status_code == 200
    assert response.json() == {
        "tenants": {
            "total": 2,
            "provisioning": 1,
            "active": 1,
            "suspended": 0,
            "closed": 0,
            "billing_required": 1,
        },
        "subscriptions": {
            "total": 1,
            "trialing": 1,
            "active": 0,
            "past_due": 0,
            "canceled": 0,
        },
        "payments": {
            "paid": 1,
            "failed": 1,
            "collected": [{"currency": "usd", "amount_cents": 2500}],
        },
    }


@pytest.mark.django_db
def test_tenant_owner_cannot_view_platform_overview(client):
    owner = User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )

    response = client.get(
        reverse("platform-overview"),
        headers=authorization_for(owner),
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_platform_admin_views_payment_list(client):
    admin = User.objects.create_superuser(
        email="admin@example.com",
        password="strong-test-password-123",
    )
    tenant = Tenant.objects.create(slug="demo", name="Demo Store")
    payment = SubscriptionPayment.objects.create(
        tenant=tenant,
        stripe_invoice_id="in_123",
        stripe_customer_id="cus_123",
        stripe_subscription_id="sub_123",
        status=SubscriptionPayment.Status.PAID,
        currency="usd",
        amount_due_cents=2500,
        amount_paid_cents=2500,
    )

    response = client.get(
        reverse("platform-payment-list"),
        headers=authorization_for(admin),
    )

    assert response.status_code == 200
    assert response.json() == [
        {
            "id": payment.id,
            "tenant_name": "Demo Store",
            "tenant_slug": "demo",
            "stripe_invoice_id": "in_123",
            "stripe_customer_id": "cus_123",
            "status": "paid",
            "currency": "usd",
            "amount_due_cents": 2500,
            "amount_paid_cents": 2500,
            "paid_at": None,
            "created_at": payment.created_at.isoformat().replace("+00:00", "Z"),
        }
    ]


@pytest.mark.django_db
def test_platform_admin_lists_blocks_and_unblocks_tenant(client):
    admin = User.objects.create_superuser(
        email="admin@example.com",
        password="strong-test-password-123",
    )
    owner = User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )
    tenant = Tenant.objects.create(
        slug="demo",
        name="Demo Store",
        status=Tenant.Status.ACTIVE,
        billing_required=True,
    )
    TenantOwner.objects.create(user=owner, tenant=tenant)
    headers = authorization_for(admin)

    listed = client.get(reverse("platform-tenant-list"), headers=headers)
    status_url = reverse("platform-tenant-status", kwargs={"pk": tenant.id})
    blocked = client.patch(
        status_url,
        data={"status": Tenant.Status.SUSPENDED},
        content_type="application/json",
        headers=headers,
    )
    unblocked = client.patch(
        status_url,
        data={"status": Tenant.Status.ACTIVE},
        content_type="application/json",
        headers=headers,
    )

    assert listed.status_code == 200
    expected_tenant = {
        "id": str(tenant.id),
        "name": "Demo Store",
        "slug": "demo",
        "status": Tenant.Status.ACTIVE,
        "billing_required": True,
        "owner_email": "owner@example.com",
        "subscription_status": "not_started",
        "customer_count": 0,
        "product_count": 0,
        "order_count": 0,
    }
    tenant_data = listed.json()[0]
    detail = client.get(
        reverse("platform-tenant-detail", kwargs={"pk": tenant.id}),
        headers=headers,
    )

    assert {key: tenant_data[key] for key in expected_tenant} == expected_tenant
    assert detail.status_code == 200
    assert {key: detail.json()[key] for key in expected_tenant} == expected_tenant
    assert blocked.status_code == 200
    assert blocked.json() == {"status": Tenant.Status.SUSPENDED}
    assert unblocked.status_code == 200
    assert unblocked.json() == {"status": Tenant.Status.ACTIVE}
