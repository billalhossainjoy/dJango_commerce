import pytest
from django.urls import reverse

from accounts.models import User
from tenancy.models import Tenant, TenantHostname, TenantOwner


@pytest.mark.django_db
def test_user_can_signup_login_refresh_and_logout(client):
    signup_response = client.post(
        reverse("auth-signup"),
        data={
            "email": "user@example.com",
            "password": "strong-test-password-123",
            "store_name": "Demo Store",
            "slug": "demo",
        },
    )

    assert signup_response.status_code == 201
    assert signup_response.json()["email"] == "user@example.com"
    assert "password" not in signup_response.json()

    user = User.objects.get(email="user@example.com")
    assert user.account_type == User.AccountType.PLATFORM
    assert not user.is_staff
    assert not user.is_superuser
    tenant = Tenant.objects.get(slug="demo")
    assert tenant.name == "Demo Store"
    assert tenant.status == Tenant.Status.PROVISIONING
    assert TenantOwner.objects.filter(user=user, tenant=tenant).exists()
    assert TenantHostname.objects.filter(
        tenant=tenant,
        hostname="demo.localhost",
    ).exists()
    assert signup_response.json()["tenant"] == {
        "id": str(tenant.id),
        "slug": "demo",
        "name": "Demo Store",
        "status": Tenant.Status.PROVISIONING,
    }

    login_response = client.post(
        reverse("auth-login"),
        data={"email": "user@example.com", "password": "strong-test-password-123"},
    )

    assert login_response.status_code == 200
    assert login_response.json()["access"]
    assert "refresh" not in login_response.json()
    refresh_cookie = login_response.cookies["platform_refresh_token"]
    assert refresh_cookie["httponly"]
    assert refresh_cookie["samesite"] == "Lax"

    refresh_response = client.post(reverse("token-refresh"))

    assert refresh_response.status_code == 200
    assert refresh_response.json()["access"]

    logout_response = client.post(reverse("auth-logout"))

    assert logout_response.status_code == 204

    rejected_refresh_response = client.post(reverse("token-refresh"))

    assert rejected_refresh_response.status_code == 401


@pytest.mark.django_db
def test_login_rejects_wrong_password(client):
    User.objects.create_user(
        email="admin@example.com",
        password="correct-password",
        account_type=User.AccountType.PLATFORM,
    )

    login_response = client.post(
        reverse("auth-login"),
        data={"email": "admin@example.com", "password": "wrong-password"},
    )

    assert login_response.status_code == 401


@pytest.mark.django_db
def test_signup_rejects_duplicate_tenant_slug_without_creating_user(client):
    Tenant.objects.create(slug="demo", name="Existing Store")

    response = client.post(
        reverse("auth-signup"),
        data={
            "email": "new-owner@example.com",
            "password": "strong-test-password-123",
            "store_name": "New Store",
            "slug": "demo",
        },
    )

    assert response.status_code == 400
    assert response.json() == {"slug": ["This store URL is already taken."]}
    assert not User.objects.filter(email="new-owner@example.com").exists()


@pytest.mark.django_db
def test_current_user_returns_owned_tenant(client):
    user = User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )
    tenant = Tenant.objects.create(
        slug="demo",
        name="Demo Store",
        status=Tenant.Status.ACTIVE,
    )
    TenantOwner.objects.create(user=user, tenant=tenant)
    login_response = client.post(
        reverse("auth-login"),
        data={
            "email": "owner@example.com",
            "password": "strong-test-password-123",
        },
    )

    response = client.get(
        reverse("auth-me"),
        headers={"authorization": f"Bearer {login_response.json()['access']}"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": str(user.id),
        "email": "owner@example.com",
        "account_type": User.AccountType.PLATFORM,
        "tenant": {
            "id": str(tenant.id),
            "slug": "demo",
            "name": "Demo Store",
            "status": Tenant.Status.ACTIVE,
        },
    }


@pytest.mark.django_db
def test_current_user_rejects_anonymous_requests(client):
    response = client.get(reverse("auth-me"))

    assert response.status_code == 401
