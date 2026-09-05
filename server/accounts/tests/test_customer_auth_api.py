import logging

import pytest
from django.core.cache import cache
from django.urls import reverse
from rest_framework_simplejwt.tokens import AccessToken

from accounts.models import User
from tenancy.models import Tenant, TenantOwner

PASSWORD = "strong-test-password-123"


@pytest.fixture(autouse=True)
def clear_throttle_cache():
    cache.clear()


def customer_url(name, tenant):
    return reverse(name, kwargs={"tenant_slug": tenant.slug})


@pytest.fixture
def active_tenant(db):
    return Tenant.objects.create(
        slug="demo",
        name="Demo Store",
        status=Tenant.Status.ACTIVE,
    )


@pytest.mark.django_db
def test_customer_can_signup_login_refresh_get_current_user_and_logout(
    client, active_tenant
):
    signup_response = client.post(
        customer_url("customer-auth-signup", active_tenant),
        data={
            "email": "buyer@example.com",
            "password": PASSWORD,
        },
    )

    assert signup_response.status_code == 201
    customer = User.objects.get(email="buyer@example.com")
    assert customer.account_type == User.AccountType.CUSTOMER
    assert customer.tenant == active_tenant

    login_response = client.post(
        customer_url("customer-auth-login", active_tenant),
        data={"email": "buyer@example.com", "password": PASSWORD},
    )

    assert login_response.status_code == 200
    assert login_response.json()["account_type"] == User.AccountType.CUSTOMER
    access = login_response.json()["access"]
    claims = AccessToken(access)
    assert claims["account_type"] == User.AccountType.CUSTOMER
    assert claims["tenant_id"] == str(active_tenant.id)
    assert claims["tenant_slug"] == active_tenant.slug
    cookie = login_response.cookies["customer_refresh_token"]
    assert cookie["httponly"]
    assert cookie["samesite"] == "Lax"
    assert cookie["path"] == "/api/v1/tenants/"

    me_response = client.get(
        customer_url("customer-auth-me", active_tenant),
        headers={"authorization": f"Bearer {access}"},
    )
    assert me_response.status_code == 200
    assert me_response.json() == {
        "id": str(customer.id),
        "email": "buyer@example.com",
        "account_type": User.AccountType.CUSTOMER,
        "tenant": {
            "id": str(active_tenant.id),
            "slug": "demo",
            "name": "Demo Store",
            "status": Tenant.Status.ACTIVE,
        },
    }

    old_refresh = client.cookies["customer_refresh_token"].value
    refresh_response = client.post(customer_url("customer-auth-refresh", active_tenant))
    assert refresh_response.status_code == 200
    assert refresh_response.json()["access"]
    assert client.cookies["customer_refresh_token"].value != old_refresh
    rotated_refresh = client.cookies["customer_refresh_token"].value

    client.cookies["customer_refresh_token"] = old_refresh
    reused_refresh = client.post(customer_url("customer-auth-refresh", active_tenant))
    assert reused_refresh.status_code == 401
    client.cookies["customer_refresh_token"] = rotated_refresh

    logout_response = client.post(customer_url("customer-auth-logout", active_tenant))
    assert logout_response.status_code == 204
    assert client.cookies["customer_refresh_token"].value == ""

    rejected_refresh = client.post(customer_url("customer-auth-refresh", active_tenant))
    assert rejected_refresh.status_code == 401


@pytest.mark.django_db
def test_same_customer_email_is_independent_per_tenant(client):
    first = Tenant.objects.create(slug="first", status=Tenant.Status.ACTIVE)
    second = Tenant.objects.create(slug="second", status=Tenant.Status.ACTIVE)
    payload = {
        "email": "buyer@example.com",
        "password": PASSWORD,
    }

    assert (
        client.post(customer_url("customer-auth-signup", first), payload).status_code
        == 201
    )
    assert (
        client.post(customer_url("customer-auth-signup", second), payload).status_code
        == 201
    )
    assert (
        User.objects.filter(
            email="buyer@example.com",
            account_type=User.AccountType.CUSTOMER,
        ).count()
        == 2
    )


@pytest.mark.django_db
def test_duplicate_customer_email_is_rejected_within_tenant(client, active_tenant):
    User.objects.create_user(
        email="buyer@example.com",
        password=PASSWORD,
        account_type=User.AccountType.CUSTOMER,
        tenant=active_tenant,
    )

    response = client.post(
        customer_url("customer-auth-signup", active_tenant),
        data={
            "email": "BUYER@example.com",
            "password": PASSWORD,
        },
    )

    assert response.status_code == 400
    assert User.objects.filter(tenant=active_tenant).count() == 1


@pytest.mark.django_db
def test_tenant_owner_email_cannot_register_as_customer(client, active_tenant):
    owner = User.objects.create_user(
        email="owner@example.com",
        password=PASSWORD,
        account_type=User.AccountType.PLATFORM,
    )
    TenantOwner.objects.create(user=owner, tenant=active_tenant)

    response = client.post(
        customer_url("customer-auth-signup", active_tenant),
        data={"email": "OWNER@example.com", "password": PASSWORD},
    )

    assert response.status_code == 400
    assert response.json() == {"email": ["An account with this email exists."]}
    assert not User.objects.filter(
        account_type=User.AccountType.CUSTOMER,
        tenant=active_tenant,
    ).exists()


@pytest.mark.django_db
def test_tenant_owner_email_can_register_as_customer_elsewhere(client, active_tenant):
    owner = User.objects.create_user(
        email="owner@example.com",
        password=PASSWORD,
        account_type=User.AccountType.PLATFORM,
    )
    TenantOwner.objects.create(user=owner, tenant=active_tenant)
    other_tenant = Tenant.objects.create(
        slug="other",
        status=Tenant.Status.ACTIVE,
    )

    response = client.post(
        customer_url("customer-auth-signup", other_tenant),
        data={"email": "owner@example.com", "password": PASSWORD},
    )

    assert response.status_code == 201
    assert User.objects.filter(
        email="owner@example.com",
        account_type=User.AccountType.CUSTOMER,
        tenant=other_tenant,
    ).exists()


@pytest.mark.django_db
def test_platform_and_customer_login_are_role_isolated(client, active_tenant):
    User.objects.create_user(
        email="owner@example.com",
        password=PASSWORD,
        account_type=User.AccountType.PLATFORM,
    )
    User.objects.create_user(
        email="buyer@example.com",
        password=PASSWORD,
        account_type=User.AccountType.CUSTOMER,
        tenant=active_tenant,
    )

    owner_on_customer = client.post(
        customer_url("customer-auth-login", active_tenant),
        data={"email": "owner@example.com", "password": PASSWORD},
    )
    customer_on_platform = client.post(
        reverse("auth-login"),
        data={"email": "buyer@example.com", "password": PASSWORD},
    )

    assert owner_on_customer.status_code == 401
    assert customer_on_platform.status_code == 401
    assert owner_on_customer.json() == {
        "detail": "Invalid email or password.",
        "code": "no_active_account",
    }

    customer_login = client.post(
        customer_url("customer-auth-login", active_tenant),
        data={"email": "buyer@example.com", "password": PASSWORD},
    )
    customer_access = customer_login.json()["access"]
    platform_me = client.get(
        reverse("auth-me"),
        headers={"authorization": f"Bearer {customer_access}"},
    )
    assert platform_me.status_code == 403


@pytest.mark.django_db
def test_tenant_owner_can_login_on_their_tenant(client, active_tenant):
    owner = User.objects.create_user(
        email="owner@example.com",
        password=PASSWORD,
        account_type=User.AccountType.PLATFORM,
    )
    TenantOwner.objects.create(user=owner, tenant=active_tenant)

    response = client.post(
        customer_url("customer-auth-login", active_tenant),
        data={"email": owner.email, "password": PASSWORD},
    )

    assert response.status_code == 200
    assert response.json()["account_type"] == User.AccountType.PLATFORM
    assert response.json()["access"]
    assert "refresh" not in response.json()
    assert response.cookies["platform_refresh_token"].value
    assert "customer_refresh_token" not in response.cookies


@pytest.mark.django_db
def test_tenant_owner_cannot_login_on_another_tenant(client, active_tenant):
    owner = User.objects.create_user(
        email="owner@example.com",
        password=PASSWORD,
        account_type=User.AccountType.PLATFORM,
    )
    owned_tenant = Tenant.objects.create(slug="owned", status=Tenant.Status.ACTIVE)
    TenantOwner.objects.create(user=owner, tenant=owned_tenant)

    response = client.post(
        customer_url("customer-auth-login", active_tenant),
        data={"email": owner.email, "password": PASSWORD},
    )

    assert response.status_code == 401
    assert response.json() == {
        "detail": "Invalid email or password.",
        "code": "no_active_account",
    }


@pytest.mark.django_db
@pytest.mark.parametrize(
    "tenant_status",
    [Tenant.Status.PROVISIONING, Tenant.Status.SUSPENDED, Tenant.Status.CLOSED],
)
def test_tenant_owner_can_login_when_tenant_is_inactive(client, tenant_status):
    tenant = Tenant.objects.create(slug="demo", status=tenant_status)
    owner = User.objects.create_user(
        email="owner@example.com",
        password=PASSWORD,
        account_type=User.AccountType.PLATFORM,
    )
    TenantOwner.objects.create(user=owner, tenant=tenant)

    response = client.post(
        customer_url("customer-auth-login", tenant),
        data={"email": owner.email, "password": PASSWORD},
    )

    assert response.status_code == 200
    assert response.json()["account_type"] == User.AccountType.PLATFORM


@pytest.mark.django_db
def test_ambiguous_tenant_login_fails_closed(client, active_tenant, caplog):
    owner = User.objects.create_user(
        email="shared@example.com",
        password=PASSWORD,
        account_type=User.AccountType.PLATFORM,
    )
    TenantOwner.objects.create(user=owner, tenant=active_tenant)
    User.objects.create_user(
        email="shared@example.com",
        password=PASSWORD,
        account_type=User.AccountType.CUSTOMER,
        tenant=active_tenant,
    )

    with caplog.at_level(logging.ERROR):
        response = client.post(
            customer_url("customer-auth-login", active_tenant),
            data={"email": "shared@example.com", "password": PASSWORD},
        )

    assert response.status_code == 401
    assert response.json() == {
        "detail": "Invalid email or password.",
        "code": "no_active_account",
    }
    assert "Ambiguous tenant login identities" in caplog.messages


@pytest.mark.django_db
def test_unknown_tenant_login_fails_generically(client):
    response = client.post(
        reverse("customer-auth-login", kwargs={"tenant_slug": "unknown"}),
        data={"email": "owner@example.com", "password": PASSWORD},
    )

    assert response.status_code == 401
    assert response.json() == {
        "detail": "Invalid email or password.",
        "code": "no_active_account",
    }


@pytest.mark.django_db
def test_customer_token_cannot_cross_tenant_boundary(client):
    first = Tenant.objects.create(slug="first", status=Tenant.Status.ACTIVE)
    second = Tenant.objects.create(slug="second", status=Tenant.Status.ACTIVE)
    customer = User.objects.create_user(
        email="buyer@example.com",
        password=PASSWORD,
        account_type=User.AccountType.CUSTOMER,
        tenant=first,
    )
    login = client.post(
        customer_url("customer-auth-login", first),
        data={"email": customer.email, "password": PASSWORD},
    )
    access = login.json()["access"]

    me_response = client.get(
        customer_url("customer-auth-me", second),
        headers={"authorization": f"Bearer {access}"},
    )
    refresh_response = client.post(customer_url("customer-auth-refresh", second))

    assert me_response.status_code == 403
    assert refresh_response.status_code == 401


@pytest.mark.django_db
@pytest.mark.parametrize(
    "tenant_status",
    [Tenant.Status.PROVISIONING, Tenant.Status.SUSPENDED, Tenant.Status.CLOSED],
)
def test_non_active_tenant_rejects_customer_auth(client, tenant_status):
    tenant = Tenant.objects.create(slug="demo", status=tenant_status)
    User.objects.create_user(
        email="buyer@example.com",
        password=PASSWORD,
        account_type=User.AccountType.CUSTOMER,
        tenant=tenant,
    )

    signup = client.post(
        customer_url("customer-auth-signup", tenant),
        data={
            "email": "buyer@example.com",
            "password": PASSWORD,
        },
    )
    login = client.post(
        customer_url("customer-auth-login", tenant),
        data={"email": "buyer@example.com", "password": PASSWORD},
    )
    refresh = client.post(customer_url("customer-auth-refresh", tenant))
    logout = client.post(customer_url("customer-auth-logout", tenant))

    assert signup.status_code == 404
    assert login.status_code == 401
    assert login.json() == {
        "detail": "Invalid email or password.",
        "code": "no_active_account",
    }
    assert refresh.status_code == 404
    assert logout.status_code == 204


@pytest.mark.django_db
def test_platform_and_customer_refresh_cookies_coexist(client, active_tenant):
    User.objects.create_user(
        email="owner@example.com",
        password=PASSWORD,
        account_type=User.AccountType.PLATFORM,
    )
    User.objects.create_user(
        email="buyer@example.com",
        password=PASSWORD,
        account_type=User.AccountType.CUSTOMER,
        tenant=active_tenant,
    )

    assert (
        client.post(
            reverse("auth-login"),
            data={"email": "owner@example.com", "password": PASSWORD},
        ).status_code
        == 200
    )
    assert (
        client.post(
            customer_url("customer-auth-login", active_tenant),
            data={"email": "buyer@example.com", "password": PASSWORD},
        ).status_code
        == 200
    )

    assert client.cookies["platform_refresh_token"].value
    assert client.cookies["customer_refresh_token"].value
    assert client.post(reverse("token-refresh")).status_code == 200
    assert (
        client.post(customer_url("customer-auth-refresh", active_tenant)).status_code
        == 200
    )


@pytest.mark.django_db
def test_tenant_login_has_generic_error_and_is_throttled(client, active_tenant):
    cache.clear()
    url = customer_url("customer-auth-login", active_tenant)

    responses = [
        client.post(
            url,
            data={"email": "missing@example.com", "password": "wrong"},
        )
        for _ in range(6)
    ]

    assert all(response.status_code == 401 for response in responses[:5])
    assert responses[0].json() == {
        "detail": "Invalid email or password.",
        "code": "no_active_account",
    }
    assert responses[5].status_code == 429


@pytest.mark.django_db
def test_customer_signup_is_throttled_per_tenant_and_ip(client, active_tenant):
    url = customer_url("customer-auth-signup", active_tenant)
    responses = [
        client.post(
            url,
            data={
                "email": f"buyer{index}@example.com",
                "password": PASSWORD,
            },
        )
        for index in range(4)
    ]

    assert all(response.status_code == 201 for response in responses[:3])
    assert responses[3].status_code == 429
