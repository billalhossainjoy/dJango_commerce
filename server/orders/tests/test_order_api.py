import pytest
from django.test import Client
from django.urls import reverse
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from catalog.models import Product
from orders.models import Cart, Order, OrderItem
from tenancy.models import Tenant, TenantOwner


def checkout_data() -> dict[str, str]:
    return {
        "email": "buyer@example.com",
        "shipping_name": "Test Buyer",
        "shipping_address_line_1": "12 Market Street",
        "shipping_city": "Dhaka",
        "shipping_postal_code": "1205",
        "shipping_country_code": "bd",
    }


def authorization_for(user: User) -> dict[str, str]:
    access_token = str(RefreshToken.for_user(user).access_token)
    return {"authorization": f"Bearer {access_token}"}


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
    assert response.json()["status"] == "confirmed"
    assert response.json()["payment_method"] == "cash_on_delivery"
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


@pytest.mark.django_db
def test_guest_can_only_retrieve_order_from_the_same_session(client):
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
    create_response = client.post(
        reverse("order-create", kwargs={"tenant_slug": tenant.slug}),
        data=checkout_data(),
        content_type="application/json",
        headers={"Idempotency-Key": "guest-order-detail"},
    )
    detail_url = reverse(
        "order-detail",
        kwargs={"tenant_slug": tenant.slug, "order_id": create_response.json()["id"]},
    )

    owner_response = client.get(detail_url)
    other_guest_response = Client().get(detail_url)

    assert owner_response.status_code == 200
    assert owner_response.json()["id"] == create_response.json()["id"]
    assert other_guest_response.status_code == 404


@pytest.mark.django_db
def test_tenant_owner_lists_only_their_store_orders(client):
    owner = User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )
    tenant = Tenant.objects.create(slug="owned", name="Owned Store")
    other_tenant = Tenant.objects.create(slug="other", name="Other Store")
    TenantOwner.objects.create(user=owner, tenant=tenant)
    order = Order.objects.create(
        tenant=tenant,
        session_key="owned-guest-session",
        email="buyer@example.com",
        shipping_name="Test Buyer",
        shipping_address_line_1="12 Market Street",
        shipping_city="Dhaka",
        shipping_postal_code="1205",
        shipping_country_code="BD",
        subtotal_cents=5900,
        shipping_cents=500,
        total_cents=6400,
    )
    OrderItem.objects.create(
        order=order,
        product_name="Canvas Backpack",
        unit_price_cents=5900,
        quantity=1,
        line_total_cents=5900,
    )
    Order.objects.create(
        tenant=other_tenant,
        session_key="other-guest-session",
        email="private@example.com",
        shipping_name="Private Buyer",
        shipping_address_line_1="Private Address",
        shipping_city="Dhaka",
        shipping_postal_code="1205",
        shipping_country_code="BD",
        subtotal_cents=1000,
        shipping_cents=500,
        total_cents=1500,
    )

    response = client.get(
        reverse("admin-order-list", kwargs={"tenant_slug": tenant.slug}),
        headers=authorization_for(owner),
    )
    detail_response = client.get(
        reverse(
            "admin-order-detail",
            kwargs={"tenant_slug": tenant.slug, "order_id": order.id},
        ),
        headers=authorization_for(owner),
    )

    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == [str(order.id)]
    assert response.json()[0]["email"] == "buyer@example.com"
    assert response.json()[0]["items"][0]["product_name"] == "Canvas Backpack"
    assert detail_response.status_code == 200
    assert detail_response.json()["shipping_name"] == "Test Buyer"


@pytest.mark.django_db
def test_tenant_owner_cannot_list_another_store_orders(client):
    owner = User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )
    owned_tenant = Tenant.objects.create(slug="owned", name="Owned Store")
    other_tenant = Tenant.objects.create(slug="other", name="Other Store")
    TenantOwner.objects.create(user=owner, tenant=owned_tenant)

    response = client.get(
        reverse("admin-order-list", kwargs={"tenant_slug": other_tenant.slug}),
        headers=authorization_for(owner),
    )

    assert response.status_code == 404


@pytest.mark.django_db
def test_tenant_owner_advances_order_fulfillment_in_sequence(client):
    owner = User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )
    tenant = Tenant.objects.create(slug="owned", name="Owned Store")
    TenantOwner.objects.create(user=owner, tenant=tenant)
    order = Order.objects.create(
        tenant=tenant,
        session_key="guest-session",
        email="buyer@example.com",
        shipping_name="Test Buyer",
        shipping_address_line_1="12 Market Street",
        shipping_city="Dhaka",
        shipping_postal_code="1205",
        shipping_country_code="BD",
        subtotal_cents=5900,
        shipping_cents=500,
        total_cents=6400,
    )
    url = reverse(
        "admin-order-status",
        kwargs={"tenant_slug": tenant.slug, "order_id": order.id},
    )
    headers = authorization_for(owner)

    skipped_response = client.patch(
        url,
        data={"fulfillment_status": "shipped"},
        content_type="application/json",
        headers=headers,
    )
    processing_response = client.patch(
        url,
        data={"fulfillment_status": "processing"},
        content_type="application/json",
        headers=headers,
    )
    shipped_response = client.patch(
        url,
        data={"fulfillment_status": "shipped"},
        content_type="application/json",
        headers=headers,
    )
    delivered_response = client.patch(
        url,
        data={"fulfillment_status": "delivered"},
        content_type="application/json",
        headers=headers,
    )

    assert skipped_response.status_code == 400
    assert processing_response.json()["fulfillment_status"] == "processing"
    assert shipped_response.json()["fulfillment_status"] == "shipped"
    assert delivered_response.json()["fulfillment_status"] == "delivered"


@pytest.mark.django_db
def test_tenant_owner_cancels_before_shipping_and_stock_is_restored_once(client):
    owner = User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )
    tenant = Tenant.objects.create(slug="owned", name="Owned Store")
    TenantOwner.objects.create(user=owner, tenant=tenant)
    product = Product.objects.create(
        tenant=tenant,
        name="Canvas Backpack",
        slug="canvas-backpack",
        price_cents=5900,
        stock_quantity=3,
    )
    order = Order.objects.create(
        tenant=tenant,
        session_key="guest-session",
        email="buyer@example.com",
        shipping_name="Test Buyer",
        shipping_address_line_1="12 Market Street",
        shipping_city="Dhaka",
        shipping_postal_code="1205",
        shipping_country_code="BD",
        subtotal_cents=11800,
        shipping_cents=500,
        total_cents=12300,
    )
    OrderItem.objects.create(
        order=order,
        product=product,
        product_name=product.name,
        unit_price_cents=product.price_cents,
        quantity=2,
        line_total_cents=11800,
    )
    url = reverse(
        "admin-order-cancel",
        kwargs={"tenant_slug": tenant.slug, "order_id": order.id},
    )
    headers = authorization_for(owner)

    response = client.post(url, headers=headers)
    retry_response = client.post(url, headers=headers)

    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"
    assert retry_response.status_code == 200
    product.refresh_from_db()
    assert product.stock_quantity == 5


@pytest.mark.django_db
def test_tenant_owner_cannot_cancel_shipped_order(client):
    owner = User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )
    tenant = Tenant.objects.create(slug="owned", name="Owned Store")
    TenantOwner.objects.create(user=owner, tenant=tenant)
    order = Order.objects.create(
        tenant=tenant,
        session_key="guest-session",
        email="buyer@example.com",
        shipping_name="Test Buyer",
        shipping_address_line_1="12 Market Street",
        shipping_city="Dhaka",
        shipping_postal_code="1205",
        shipping_country_code="BD",
        subtotal_cents=5900,
        shipping_cents=500,
        total_cents=6400,
        fulfillment_status=Order.FulfillmentStatus.SHIPPED,
    )

    response = client.post(
        reverse(
            "admin-order-cancel",
            kwargs={"tenant_slug": tenant.slug, "order_id": order.id},
        ),
        headers=authorization_for(owner),
    )

    assert response.status_code == 400
    assert response.json() == {
        "status": "An order cannot be cancelled after it has shipped."
    }
