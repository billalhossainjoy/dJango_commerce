import pytest
from django.urls import reverse
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from catalog.models import Product
from tenancy.models import Tenant, TenantOwner


def authorization_for(user: User) -> dict[str, str]:
    access_token = str(RefreshToken.for_user(user).access_token)
    return {"authorization": f"Bearer {access_token}"}


@pytest.mark.django_db
def test_owner_can_create_and_list_products_for_their_tenant(client):
    owner = User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )
    tenant = Tenant.objects.create(slug="demo", name="Demo Store")
    TenantOwner.objects.create(user=owner, tenant=tenant)
    url = reverse("admin-product-list", kwargs={"tenant_slug": tenant.slug})

    create_response = client.post(
        url,
        data={
            "name": "Canvas Backpack",
            "slug": "canvas-backpack",
            "description": "A durable everyday bag.",
            "price_cents": 5900,
            "stock_quantity": 12,
            "is_active": True,
        },
        content_type="application/json",
        headers=authorization_for(owner),
    )
    list_response = client.get(url, headers=authorization_for(owner))

    assert create_response.status_code == 201
    assert create_response.json()["price_cents"] == 5900
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1
    assert Product.objects.get().tenant == tenant


@pytest.mark.django_db
def test_owner_cannot_access_another_tenants_product(client):
    owner = User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )
    owned_tenant = Tenant.objects.create(slug="owned", name="Owned Store")
    other_tenant = Tenant.objects.create(slug="other", name="Other Store")
    TenantOwner.objects.create(user=owner, tenant=owned_tenant)
    product = Product.objects.create(
        tenant=other_tenant,
        name="Private Product",
        slug="private-product",
        price_cents=1000,
    )

    response = client.patch(
        reverse(
            "admin-product-detail",
            kwargs={"tenant_slug": owned_tenant.slug, "pk": product.id},
        ),
        data={"name": "Changed"},
        content_type="application/json",
        headers=authorization_for(owner),
    )

    assert response.status_code == 404
    product.refresh_from_db()
    assert product.name == "Private Product"


@pytest.mark.django_db
def test_public_products_include_only_active_products_from_active_tenant(client):
    tenant = Tenant.objects.create(
        slug="demo",
        name="Demo Store",
        status=Tenant.Status.ACTIVE,
    )
    Product.objects.create(
        tenant=tenant,
        name="Visible Product",
        slug="visible-product",
        price_cents=2500,
        is_active=True,
    )
    Product.objects.create(
        tenant=tenant,
        name="Draft Product",
        slug="draft-product",
        price_cents=1500,
        is_active=False,
    )

    response = client.get(
        reverse("public-product-list", kwargs={"tenant_slug": tenant.slug})
    )

    assert response.status_code == 200
    assert [product["name"] for product in response.json()] == ["Visible Product"]
