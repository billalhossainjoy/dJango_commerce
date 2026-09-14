import pytest
from django.contrib.auth.hashers import get_hasher
from django.test import override_settings
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from accounts.emails.actions import verification_tokens
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
    assert tenant.billing_required is True
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
        "canonical_hostname": "demo.localhost",
    }

    verified = client.post(
        reverse("auth-verify-email"),
        data={
            "uid": urlsafe_base64_encode(force_bytes(user.pk)),
            "token": verification_tokens.make_token(user),
        },
    )
    assert verified.status_code == 200

    login_response = client.post(
        reverse("auth-login"),
        data={"email": "user@example.com", "password": "strong-test-password-123"},
    )

    assert login_response.status_code == 200
    assert login_response.json()["access"]
    assert login_response.json()["is_staff"] is False
    assert "refresh" not in login_response.json()
    refresh_cookie = login_response.cookies["platform_refresh_token"]
    assert refresh_cookie["httponly"]
    assert refresh_cookie["samesite"] == "Lax"
    assert refresh_cookie["domain"] == ""

    refresh_response = client.post(reverse("token-refresh"))

    assert refresh_response.status_code == 200
    assert refresh_response.json()["access"]

    logout_response = client.post(reverse("auth-logout"))

    assert logout_response.status_code == 204

    rejected_refresh_response = client.post(reverse("token-refresh"))

    assert rejected_refresh_response.status_code == 401


@pytest.mark.django_db
def test_platform_admin_login_returns_staff_role(client):
    User.objects.create_superuser(
        email="admin@example.com",
        password="strong-test-password-123",
    )

    response = client.post(
        reverse("auth-login"),
        data={
            "email": "admin@example.com",
            "password": "strong-test-password-123",
        },
    )

    assert response.status_code == 200
    assert response.json()["is_staff"] is True


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
def test_platform_login_ignores_same_email_customer_on_another_tenant(client):
    User.objects.create_user(
        email="owner@example.com",
        password="owner-password-123",
        account_type=User.AccountType.PLATFORM,
    )
    tenant = Tenant.objects.create(slug="other", status=Tenant.Status.ACTIVE)
    User.objects.create_user(
        email="owner@example.com",
        password="customer-password-123",
        account_type=User.AccountType.CUSTOMER,
        tenant=tenant,
    )

    response = client.post(
        reverse("auth-login"),
        data={"email": "owner@example.com", "password": "owner-password-123"},
    )

    assert response.status_code == 200
    assert response.json()["access"]
    assert response.cookies["platform_refresh_token"].value


@pytest.mark.django_db
@override_settings(JWT_PLATFORM_REFRESH_COOKIE_DOMAIN=".example.com")
def test_platform_refresh_cookie_uses_configured_shared_domain(client):
    User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )

    login_response = client.post(
        reverse("auth-login"),
        data={
            "email": "owner@example.com",
            "password": "strong-test-password-123",
        },
    )
    refresh_response = client.post(reverse("token-refresh"))
    logout_response = client.post(reverse("auth-logout"))

    assert login_response.cookies["platform_refresh_token"]["domain"] == (
        ".example.com"
    )
    assert logout_response.cookies["platform_refresh_token"]["domain"] == (
        ".example.com"
    )
    assert refresh_response.status_code == 200
    assert "refresh" not in refresh_response.json()
    for response in (login_response, refresh_response, logout_response):
        cookie = response.cookies["platform_refresh_token"]
        assert cookie["domain"] == ".example.com"
        assert cookie["path"] == "/api/v1/auth/"


@pytest.mark.django_db
@pytest.mark.parametrize("active", [None, False, True])
def test_failed_platform_login_always_runs_password_hashing(
    client, monkeypatch, active
):
    if active is not None:
        User.objects.create_user(
            email="owner@example.com",
            password="correct-password-123",
            account_type=User.AccountType.PLATFORM,
            is_active=active,
        )
    hasher = type(get_hasher())
    encode = hasher.encode
    calls = []

    def counted_encode(*args, **kwargs):
        calls.append(True)
        return encode(*args, **kwargs)

    monkeypatch.setattr(hasher, "encode", counted_encode)
    response = client.post(
        reverse("auth-login"),
        data={"email": "owner@example.com", "password": "wrong-password-123"},
    )
    assert response.status_code == 401
    assert response.json() == {
        "detail": "Invalid email or password.",
        "code": "no_active_account",
    }
    assert len(calls) == 1


@pytest.mark.django_db
@pytest.mark.parametrize("customer", [False, True])
def test_signup_rejects_weak_password_without_creating_account(client, customer):
    data = {
        "email": "new@example.com",
        "password": "123",
        "store_name": "New",
        "slug": "new",
    }
    if customer:
        tenant = Tenant.objects.create(slug="store", status=Tenant.Status.ACTIVE)
        url = reverse("customer-auth-signup", kwargs={"tenant_slug": tenant.slug})
    else:
        url = reverse("auth-signup")
    response = client.post(url, data=data)
    assert response.status_code == 400
    assert "password" in response.json()
    assert not User.objects.filter(email=data["email"]).exists()


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
    TenantHostname.objects.create(
        tenant=tenant,
        hostname="demo.localhost",
    )
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
        "is_staff": False,
        "tenant": {
            "id": str(tenant.id),
            "slug": "demo",
            "name": "Demo Store",
            "status": Tenant.Status.ACTIVE,
            "canonical_hostname": "demo.localhost",
        },
    }


@pytest.mark.django_db
def test_current_user_rejects_anonymous_requests(client):
    response = client.get(reverse("auth-me"))

    assert response.status_code == 401
