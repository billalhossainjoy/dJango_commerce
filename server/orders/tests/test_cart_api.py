import pytest
from django.urls import reverse
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from catalog.models import Product
from orders.models import Cart
from tenancy.models import Tenant


def authorization_for(user: User) -> dict[str, str]:
    access_token = str(RefreshToken.for_user(user).access_token)
    return {"authorization": f"Bearer {access_token}"}


@pytest.mark.django_db
def test_guest_can_add_and_retrieve_tenant_cart(client):
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

    add_response = client.post(
        reverse("cart-item-create", kwargs={"tenant_slug": tenant.slug}),
        data={"product_id": str(product.id), "quantity": 2},
        content_type="application/json",
    )
    cart_response = client.get(
        reverse("cart-detail", kwargs={"tenant_slug": tenant.slug})
    )

    assert add_response.status_code == 201
    assert cart_response.status_code == 200
    assert cart_response.json()["item_count"] == 2
    assert cart_response.json()["subtotal_cents"] == 11800
    assert cart_response.json()["items"][0]["product"]["id"] == str(product.id)
    assert Cart.objects.get().tenant == tenant
    assert Cart.objects.get().session_key


@pytest.mark.django_db
def test_cart_rejects_quantity_above_available_stock(client):
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
        stock_quantity=1,
    )

    response = client.post(
        reverse("cart-item-create", kwargs={"tenant_slug": tenant.slug}),
        data={"product_id": str(product.id), "quantity": 2},
        content_type="application/json",
    )

    assert response.status_code == 400
    assert response.json() == {"quantity": "The requested quantity is not available."}


@pytest.mark.django_db
def test_customer_can_claim_guest_cart_after_login(client):
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
    customer = User.objects.create_user(
        email="customer@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.CUSTOMER,
        tenant=tenant,
    )
    client.post(
        reverse("cart-item-create", kwargs={"tenant_slug": tenant.slug}),
        data={"product_id": str(product.id), "quantity": 2},
        content_type="application/json",
    )

    response = client.post(
        reverse("cart-claim", kwargs={"tenant_slug": tenant.slug}),
        headers=authorization_for(customer),
    )

    assert response.status_code == 200
    assert response.json()["item_count"] == 2
    assert response.json()["items"][0]["product"]["id"] == str(product.id)
    assert Cart.objects.filter(tenant=tenant, customer=customer).exists()
    assert not Cart.objects.filter(tenant=tenant, customer=None).exists()


@pytest.mark.django_db
def test_customer_cannot_access_another_tenant_cart(client):
    customer_tenant = Tenant.objects.create(
        slug="customer-store",
        name="Customer Store",
        status=Tenant.Status.ACTIVE,
    )
    other_tenant = Tenant.objects.create(
        slug="other-store",
        name="Other Store",
        status=Tenant.Status.ACTIVE,
    )
    customer = User.objects.create_user(
        email="customer@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.CUSTOMER,
        tenant=customer_tenant,
    )

    response = client.get(
        reverse("cart-detail", kwargs={"tenant_slug": other_tenant.slug}),
        headers=authorization_for(customer),
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_guest_can_update_and_remove_cart_item(client):
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
    add_response = client.post(
        reverse("cart-item-create", kwargs={"tenant_slug": tenant.slug}),
        data={"product_id": str(product.id)},
        content_type="application/json",
    )
    item_id = add_response.json()["items"][0]["id"]

    update_response = client.patch(
        reverse(
            "cart-item-detail",
            kwargs={"tenant_slug": tenant.slug, "item_id": item_id},
        ),
        data={"quantity": 3},
        content_type="application/json",
    )
    delete_response = client.delete(
        reverse(
            "cart-item-detail",
            kwargs={"tenant_slug": tenant.slug, "item_id": item_id},
        )
    )
    cart_response = client.get(
        reverse("cart-detail", kwargs={"tenant_slug": tenant.slug})
    )

    assert update_response.status_code == 200
    assert update_response.json()["items"][0]["quantity"] == 3
    assert update_response.json()["subtotal_cents"] == 17700
    assert delete_response.status_code == 204
    assert cart_response.json()["items"] == []


@pytest.mark.django_db
def test_cart_update_rejects_quantity_above_available_stock(client):
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
    add_response = client.post(
        reverse("cart-item-create", kwargs={"tenant_slug": tenant.slug}),
        data={"product_id": str(product.id)},
        content_type="application/json",
    )
    item_id = add_response.json()["items"][0]["id"]

    response = client.patch(
        reverse(
            "cart-item-detail",
            kwargs={"tenant_slug": tenant.slug, "item_id": item_id},
        ),
        data={"quantity": 3},
        content_type="application/json",
    )

    assert response.status_code == 400
    assert response.json() == {"quantity": "The requested quantity is not available."}
