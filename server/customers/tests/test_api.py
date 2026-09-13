"""Customer-management API tests."""

import pytest
from django.urls import reverse
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from tenancy.models import Tenant, TenantOwner


def authorization_for(user: User) -> dict[str, str]:
    access_token = str(RefreshToken.for_user(user).access_token)
    return {"authorization": f"Bearer {access_token}"}


@pytest.mark.django_db
def test_owner_lists_only_their_tenants_customers(client):
    owner = User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )
    tenant = Tenant.objects.create(
        slug="owned",
        name="Owned Store",
        status=Tenant.Status.ACTIVE,
    )
    other_tenant = Tenant.objects.create(slug="other", name="Other Store")
    TenantOwner.objects.create(user=owner, tenant=tenant)
    older_customer = User.objects.create_user(
        email="older@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.CUSTOMER,
        tenant=tenant,
    )
    newer_customer = User.objects.create_user(
        email="newer@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.CUSTOMER,
        tenant=tenant,
    )
    User.objects.create_user(
        email="private@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.CUSTOMER,
        tenant=other_tenant,
    )

    response = client.get(
        reverse("admin-customer-list", kwargs={"tenant_slug": tenant.slug}),
        headers=authorization_for(owner),
    )

    assert response.status_code == 200
    assert response.json() == [
        {
            "id": str(newer_customer.id),
            "email": newer_customer.email,
            "is_active": True,
            "date_joined": newer_customer.date_joined.isoformat().replace(
                "+00:00", "Z"
            ),
        },
        {
            "id": str(older_customer.id),
            "email": older_customer.email,
            "is_active": True,
            "date_joined": older_customer.date_joined.isoformat().replace(
                "+00:00", "Z"
            ),
        },
    ]


@pytest.mark.django_db
def test_owner_cannot_list_another_tenants_customers(client):
    owner = User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )
    owned_tenant = Tenant.objects.create(slug="owned", name="Owned Store")
    other_tenant = Tenant.objects.create(slug="other", name="Other Store")
    TenantOwner.objects.create(user=owner, tenant=owned_tenant)

    response = client.get(
        reverse("admin-customer-list", kwargs={"tenant_slug": other_tenant.slug}),
        headers=authorization_for(owner),
    )

    assert response.status_code == 404


@pytest.mark.django_db
def test_owner_can_search_customers_by_email(client):
    owner = User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )
    tenant = Tenant.objects.create(slug="owned", name="Owned Store")
    TenantOwner.objects.create(user=owner, tenant=tenant)
    matching_customer = User.objects.create_user(
        email="alice@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.CUSTOMER,
        tenant=tenant,
    )
    User.objects.create_user(
        email="bob@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.CUSTOMER,
        tenant=tenant,
    )

    response = client.get(
        reverse("admin-customer-list", kwargs={"tenant_slug": tenant.slug}),
        data={"search": "ALICE"},
        headers=authorization_for(owner),
    )

    assert response.status_code == 200
    assert [customer["id"] for customer in response.json()] == [
        str(matching_customer.id)
    ]


@pytest.mark.django_db
def test_owner_can_block_their_customer(client):
    owner = User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )
    tenant = Tenant.objects.create(
        slug="owned",
        name="Owned Store",
        status=Tenant.Status.ACTIVE,
    )
    TenantOwner.objects.create(user=owner, tenant=tenant)
    customer = User.objects.create_user(
        email="customer@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.CUSTOMER,
        tenant=tenant,
    )
    customer_authorization = authorization_for(customer)

    response = client.patch(
        reverse(
            "admin-customer-detail",
            kwargs={"tenant_slug": tenant.slug, "pk": customer.id},
        ),
        data={"is_active": False, "email": "changed@example.com"},
        content_type="application/json",
        headers=authorization_for(owner),
    )

    assert response.status_code == 200
    customer.refresh_from_db()
    assert customer.is_active is False
    assert customer.email == "customer@example.com"

    customer_response = client.get(
        reverse("customer-auth-me", kwargs={"tenant_slug": tenant.slug}),
        headers=customer_authorization,
    )
    assert customer_response.status_code == 401

    blocked_login = client.post(
        reverse("customer-auth-login", kwargs={"tenant_slug": tenant.slug}),
        data={
            "email": customer.email,
            "password": "strong-test-password-123",
        },
    )
    assert blocked_login.status_code == 401
    assert blocked_login.json() == {
        "detail": "Your customer account has been blocked. Contact the store owner.",
        "code": "account_blocked",
    }

    wrong_password = client.post(
        reverse("customer-auth-login", kwargs={"tenant_slug": tenant.slug}),
        data={"email": customer.email, "password": "wrong-password"},
    )
    assert wrong_password.status_code == 401
    assert wrong_password.json() == {
        "detail": "Invalid email or password.",
        "code": "no_active_account",
    }


@pytest.mark.django_db
def test_owner_cannot_block_another_tenants_customer(client):
    owner = User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )
    owned_tenant = Tenant.objects.create(slug="owned", name="Owned Store")
    other_tenant = Tenant.objects.create(slug="other", name="Other Store")
    TenantOwner.objects.create(user=owner, tenant=owned_tenant)
    customer = User.objects.create_user(
        email="customer@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.CUSTOMER,
        tenant=other_tenant,
    )

    response = client.patch(
        reverse(
            "admin-customer-detail",
            kwargs={"tenant_slug": owned_tenant.slug, "pk": customer.id},
        ),
        data={"is_active": False},
        content_type="application/json",
        headers=authorization_for(owner),
    )

    assert response.status_code == 404
    customer.refresh_from_db()
    assert customer.is_active is True
