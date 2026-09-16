from datetime import UTC, datetime, timedelta

import pytest
from django.urls import reverse
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from catalog.models import Product
from orders.models import Order
from tenancy.models import Tenant, TenantOwner

pytestmark = pytest.mark.django_db


@pytest.fixture
def store():
    tenant = Tenant.objects.create(slug="dashboard", name="Dashboard Store")
    owner = User.objects.create_user(
        email="owner@example.com", account_type=User.AccountType.PLATFORM
    )
    TenantOwner.objects.create(tenant=tenant, user=owner)
    return tenant, owner


def auth(user):
    return {"authorization": f"Bearer {RefreshToken.for_user(user).access_token}"}


def overview_url(tenant):
    return reverse("tenant-overview", kwargs={"tenant_slug": tenant.slug})


def order(tenant, amount, created_at, **kwargs):
    result = Order.objects.create(
        tenant=tenant,
        session_key="guest-session",
        email="buyer@example.com",
        shipping_name="Test Buyer",
        shipping_address_line_1="123 Main Street",
        shipping_city="Boston",
        shipping_postal_code="02108",
        shipping_country_code="US",
        subtotal_cents=amount - 100,
        shipping_cents=100,
        total_cents=amount,
        **kwargs,
    )
    Order.objects.filter(pk=result.pk).update(created_at=created_at)
    return result


def test_overview_scopes_every_metric_and_counts_order_value_correctly(
    client, store, monkeypatch
):
    tenant, owner = store
    today = datetime(2026, 9, 13, 12, tzinfo=UTC)
    monkeypatch.setattr("tenancy.overview.timezone.localdate", lambda: today.date())
    other = Tenant.objects.create(slug="other", name="Other Store")
    for target, slug, stock, active in [
        (tenant, "low", 5, True),
        (tenant, "empty", 0, True),
        (tenant, "draft", 0, False),
        (other, "other", 0, True),
    ]:
        Product.objects.create(
            tenant=target,
            name=slug,
            slug=slug,
            price_cents=500,
            stock_quantity=stock,
            is_active=active,
        )
    for target in (tenant, other):
        User.objects.create_user(
            email="customer@example.com",
            account_type=User.AccountType.CUSTOMER,
            tenant=target,
        )
    order(tenant, 1200, today, status=Order.Status.CONFIRMED)
    order(
        tenant,
        2300,
        today,
        status=Order.Status.PAID,
        fulfillment_status=Order.FulfillmentStatus.DELIVERED,
    )
    order(tenant, 9900, today, status=Order.Status.CANCELLED)
    order(tenant, 8000, today, status=Order.Status.PENDING_PAYMENT)
    # First day is inclusive; the instant before it is excluded from the chart.
    boundary = today.replace(hour=0) - timedelta(days=6)
    order(tenant, 700, boundary)
    order(tenant, 600, boundary - timedelta(seconds=1))
    order(other, 99999, today)

    response = client.get(overview_url(tenant), {"days": "7"}, headers=auth(owner))

    assert response.status_code == 200
    data = response.json()
    assert data["products"] == {
        "total": 3,
        "active": 2,
        "out_of_stock": 1,
        "low_stock": 1,
    }
    assert data["customers"] == 1
    assert data["total_orders"] == 6
    assert data["period"] == {"orders": 5, "order_value_cents": 4200}
    assert len(data["daily"]) == 7
    assert data["daily"][0] == {
        "date": "2026-09-07",
        "orders": 1,
        "order_value_cents": 700,
    }
    assert data["daily"][1] == {
        "date": "2026-09-08",
        "orders": 0,
        "order_value_cents": 0,
    }
    assert data["daily"][-1] == {
        "date": "2026-09-13",
        "orders": 4,
        "order_value_cents": 3500,
    }
    assert {row["status"]: row["count"] for row in data["fulfillment"]} == {
        "unfulfilled": 3,
        "processing": 0,
        "shipped": 0,
        "delivered": 1,
    }
    assert len(data["recent_orders"]) == 5
    assert all(row["total_cents"] != 99999 for row in data["recent_orders"])


def test_overview_denies_other_owners_customers_and_anonymous_visitors(client, store):
    tenant, owner = store
    other = Tenant.objects.create(slug="other", name="Other Store")
    assert client.get(overview_url(other), headers=auth(owner)).status_code == 404
    assert client.get(overview_url(tenant)).status_code == 401
    customer = User.objects.create_user(
        email="customer@example.com",
        account_type=User.AccountType.CUSTOMER,
        tenant=tenant,
    )
    assert client.get(overview_url(tenant), headers=auth(customer)).status_code == 403


def test_empty_overview_and_bounded_periods(client, store):
    tenant, owner = store
    for days in (7, 30, 90):
        response = client.get(overview_url(tenant), {"days": days}, headers=auth(owner))
        assert response.status_code == 200
        data = response.json()
        assert len(data["daily"]) == days
        assert data["period"] == {"orders": 0, "order_value_cents": 0}
        assert all(
            row["orders"] == row["order_value_cents"] == 0 for row in data["daily"]
        )
        assert data["recent_orders"] == []
    for invalid_days in ("0", "365", "invalid"):
        assert (
            client.get(
                overview_url(tenant), {"days": invalid_days}, headers=auth(owner)
            ).status_code
            == 400
        )
