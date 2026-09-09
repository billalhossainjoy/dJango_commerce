import pytest
from django.urls import reverse

from catalog.models import Product
from orders.models import Cart, Order
from tenancy.models import Tenant


def checkout_data() -> dict[str, str]:
    return {
        "email": "buyer@example.com",
        "shipping_name": "Test Buyer",
        "shipping_address_line_1": "12 Market Street",
        "shipping_city": "Dhaka",
        "shipping_postal_code": "1205",
        "shipping_country_code": "bd",
    }


@pytest.mark.django_db
def test_guest_can_create_order_from_cart(client):
    tenant = Tenant.objects.create(
        slug="demo",
        name="Demo Store",
        status=Tenant.Status.ACTIVE,
    )
    product = Product.objects.create(
        tenant=tenant,
        name="Canvas Backpack",
        slug="canvas-backpack",
        price_cents=5900,
        stock_quantity=5,
    )
    client.post(
        reverse("cart-item-create", kwargs={"tenant_slug": tenant.slug}),
        data={"product_id": str(product.id), "quantity": 2},
        content_type="application/json",
    )

    response = client.post(
        reverse("order-create", kwargs={"tenant_slug": tenant.slug}),
        data=checkout_data(),
        content_type="application/json",
        headers={"Idempotency-Key": "checkout-attempt-1"},
    )

    assert response.status_code == 201
    assert response.json()["subtotal_cents"] == 11800
    assert response.json()["shipping_cents"] == 500
    assert response.json()["total_cents"] == 12300
    assert response.json()["shipping_country_code"] == "BD"
    assert response.json()["items"][0] == {
        "id": response.json()["items"][0]["id"],
        "product_id": str(product.id),
        "product_name": "Canvas Backpack",
        "unit_price_cents": 5900,
        "quantity": 2,
        "line_total_cents": 11800,
    }
    product.refresh_from_db()
    assert product.stock_quantity == 3
    assert not Cart.objects.exists()


@pytest.mark.django_db
def test_order_creation_is_idempotent(client):
    tenant = Tenant.objects.create(
        slug="demo",
        name="Demo Store",
        status=Tenant.Status.ACTIVE,
    )
    product = Product.objects.create(
        tenant=tenant,
        name="Canvas Backpack",
        slug="canvas-backpack",
        price_cents=5900,
        stock_quantity=5,
    )
    client.post(
        reverse("cart-item-create", kwargs={"tenant_slug": tenant.slug}),
        data={"product_id": str(product.id)},
        content_type="application/json",
    )
    url = reverse("order-create", kwargs={"tenant_slug": tenant.slug})
    headers = {"Idempotency-Key": "same-checkout-attempt"}

    first_response = client.post(
        url,
        data=checkout_data(),
        content_type="application/json",
        headers=headers,
    )
    retry_response = client.post(
        url,
        data=checkout_data(),
        content_type="application/json",
        headers=headers,
    )

    assert first_response.status_code == 201
    assert retry_response.status_code == 200
    assert retry_response.json()["id"] == first_response.json()["id"]
    assert Order.objects.count() == 1
    product.refresh_from_db()
    assert product.stock_quantity == 4


@pytest.mark.django_db
def test_order_creation_revalidates_stock(client):
    tenant = Tenant.objects.create(
        slug="demo",
        name="Demo Store",
        status=Tenant.Status.ACTIVE,
    )
    product = Product.objects.create(
        tenant=tenant,
        name="Limited Product",
        slug="limited-product",
        price_cents=2500,
        stock_quantity=2,
    )
    client.post(
        reverse("cart-item-create", kwargs={"tenant_slug": tenant.slug}),
        data={"product_id": str(product.id), "quantity": 2},
        content_type="application/json",
    )
    product.stock_quantity = 1
    product.save(update_fields=["stock_quantity", "updated_at"])

    response = client.post(
        reverse("order-create", kwargs={"tenant_slug": tenant.slug}),
        data=checkout_data(),
        content_type="application/json",
        headers={"Idempotency-Key": "stock-check"},
    )

    assert response.status_code == 400
    assert response.json() == {"cart": "Only 1 of Limited Product remain."}
    assert not Order.objects.exists()
    assert Cart.objects.exists()
