import re
from datetime import timedelta
from smtplib import SMTPException
from urllib.parse import parse_qs, urlsplit

import pytest
from django.core import mail
from django.core.cache import cache
from django.core.mail import EmailMultiAlternatives
from django.db import transaction
from django.urls import reverse
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.emails.actions import reset_tokens, verification_tokens
from accounts.emails.delivery import deliver_pending, queue_email
from accounts.models import OutboundEmail, User
from tenancy.models import Tenant, TenantOwner

pytestmark = pytest.mark.django_db
PASSWORD = "Strong-original-password-456!"
NEW_PASSWORD = "Different-strong-password-789!"


@pytest.fixture(autouse=True)
def email_settings(settings):
    settings.MAILERS = {
        "default": {"BACKEND": "django.core.mail.backends.locmem.EmailBackend"}
    }
    settings.PLATFORM_FRONTEND_ORIGIN = "https://www.stockfare.app"
    settings.PLATFORM_ROOT_DOMAIN = "stockfare.app"
    settings.ALLOWED_HOSTS = ["testserver", "attacker.example"]
    cache.clear()


def platform_user(**kwargs):
    return User.objects.create_user(
        email="owner@example.com",
        password=PASSWORD,
        account_type=User.AccountType.PLATFORM,
        **kwargs,
    )


def payload(user, generator):
    return {
        "uid": urlsafe_base64_encode(force_bytes(user.pk)),
        "token": generator.make_token(user),
    }


def message_link():
    match = re.search(r"https://\S+", str(mail.outbox[0].body))
    assert match is not None
    return match.group()


def test_signup_sends_optional_single_use_verification_link(
    client, django_capture_on_commit_callbacks
):
    with django_capture_on_commit_callbacks(execute=True):
        response = client.post(
            reverse("auth-signup"),
            data={
                "email": "owner@example.com",
                "password": PASSWORD,
                "store_name": "My Store",
                "slug": "my-store",
            },
            HTTP_HOST="attacker.example",
        )
    assert response.status_code == 201
    user = User.objects.get(email="owner@example.com")
    assert not user.email_verification_required
    assert user.email_verified_at is None
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == [user.email]
    assert isinstance(mail.outbox[0], EmailMultiAlternatives)
    assert mail.outbox[0].alternatives[0][1] == "text/html"
    url = message_link()
    assert urlsplit(url).netloc == "www.stockfare.app"
    assert "attacker.example" not in url
    data = {key: values[0] for key, values in parse_qs(urlsplit(url).query).items()}
    login = {"email": user.email, "password": PASSWORD}
    assert client.post(reverse("auth-login"), data=login).status_code == 200
    assert client.post(reverse("token-refresh")).status_code == 200
    # A verification token cannot change a password.
    assert (
        client.post(
            reverse("auth-reset-password"), data={**data, "new_password": NEW_PASSWORD}
        ).status_code
        == 400
    )
    assert client.post(reverse("auth-verify-email"), data=data).status_code == 200
    assert client.post(reverse("auth-verify-email"), data=data).status_code == 400
    assert client.post(reverse("auth-login"), data=login).status_code == 200


def test_customer_links_are_scoped_to_the_store(
    client, django_capture_on_commit_callbacks
):
    first = Tenant.objects.create(
        slug="first", name="First Store", status=Tenant.Status.ACTIVE
    )
    second = Tenant.objects.create(
        slug="second", name="Second Store", status=Tenant.Status.ACTIVE
    )
    with django_capture_on_commit_callbacks(execute=True):
        response = client.post(
            reverse("customer-auth-signup", kwargs={"tenant_slug": first.slug}),
            data={"email": "buyer@example.com", "password": PASSWORD},
        )
    assert response.status_code == 201
    user = User.objects.get(email="buyer@example.com")
    assert not user.email_verification_required
    assert user.email_verified_at is None
    assert (
        client.post(
            reverse("customer-auth-login", kwargs={"tenant_slug": first.slug}),
            data={"email": user.email, "password": PASSWORD},
        ).status_code
        == 200
    )
    assert (
        client.post(
            reverse("customer-auth-refresh", kwargs={"tenant_slug": first.slug})
        ).status_code
        == 200
    )
    assert "https://first.stockfare.app/verify-email?" in mail.outbox[0].body
    token = payload(user, verification_tokens)
    assert (
        client.post(
            reverse("customer-verify-email", kwargs={"tenant_slug": second.slug}),
            data=token,
        ).status_code
        == 400
    )
    assert client.post(reverse("auth-verify-email"), data=token).status_code == 400
    assert (
        client.post(
            reverse("customer-verify-email", kwargs={"tenant_slug": first.slug}),
            data=token,
        ).status_code
        == 200
    )


@pytest.mark.parametrize(
    "account_type", [User.AccountType.PLATFORM, User.AccountType.CUSTOMER]
)
@pytest.mark.parametrize("legacy_required", [False, True])
def test_unverified_accounts_can_login_refresh_and_access_profile(
    client, account_type, legacy_required
):
    tenant = Tenant.objects.create(slug="optional", status=Tenant.Status.ACTIVE)
    user = User.objects.create_user(
        email="unverified@example.com",
        password=PASSWORD,
        account_type=account_type,
        tenant=tenant if account_type == User.AccountType.CUSTOMER else None,
        email_verification_required=legacy_required,
    )
    if account_type == User.AccountType.CUSTOMER:
        kwargs = {"tenant_slug": tenant.slug}
        login_url = reverse("customer-auth-login", kwargs=kwargs)
        refresh_url = reverse("customer-auth-refresh", kwargs=kwargs)
        profile_url = reverse("customer-auth-me", kwargs=kwargs)
    else:
        login_url = reverse("auth-login")
        refresh_url = reverse("token-refresh")
        profile_url = reverse("auth-me")
    assert (
        client.post(
            login_url, data={"email": user.email, "password": PASSWORD}
        ).status_code
        == 200
    )
    refreshed = client.post(refresh_url)
    assert refreshed.status_code == 200
    assert (
        client.get(
            profile_url,
            headers={"authorization": f"Bearer {refreshed.json()['access']}"},
        ).status_code
        == 200
    )
    user.refresh_from_db()
    assert user.email_verified_at is None


def test_reset_is_single_use_and_revokes_access_and_refresh(
    client, django_capture_on_commit_callbacks
):
    user = platform_user()
    login = client.post(
        reverse("auth-login"), data={"email": user.email, "password": PASSWORD}
    )
    access = login.json()["access"]
    with django_capture_on_commit_callbacks(execute=True):
        response = client.post(
            reverse("auth-request-password-reset"), data={"email": user.email}
        )
    assert response.status_code == 200
    assert len(mail.outbox) == 1
    url = message_link()
    data = {key: values[0] for key, values in parse_qs(urlsplit(url).query).items()}
    assert (
        client.post(
            reverse("auth-reset-password"), data={**data, "new_password": "123"}
        ).status_code
        == 400
    )
    assert (
        client.post(
            reverse("auth-reset-password"), data={**data, "new_password": NEW_PASSWORD}
        ).status_code
        == 200
    )
    assert (
        client.post(
            reverse("auth-reset-password"), data={**data, "new_password": PASSWORD}
        ).status_code
        == 400
    )
    assert (
        client.get(
            reverse("auth-me"), headers={"authorization": f"Bearer {access}"}
        ).status_code
        == 401
    )
    assert client.post(reverse("token-refresh")).status_code == 401
    assert (
        client.post(
            reverse("auth-login"), data={"email": user.email, "password": PASSWORD}
        ).status_code
        == 401
    )
    assert (
        client.post(
            reverse("auth-login"), data={"email": user.email, "password": NEW_PASSWORD}
        ).status_code
        == 200
    )


def test_reset_does_not_cross_tenants_with_same_email(client):
    first = Tenant.objects.create(slug="first")
    second = Tenant.objects.create(slug="second")
    users = [
        User.objects.create_user(
            email="buyer@example.com",
            password=PASSWORD,
            account_type=User.AccountType.CUSTOMER,
            tenant=tenant,
        )
        for tenant in [first, second]
    ]
    data = {**payload(users[0], reset_tokens), "new_password": NEW_PASSWORD}
    assert (
        client.post(
            reverse("customer-reset-password", kwargs={"tenant_slug": second.slug}),
            data=data,
        ).status_code
        == 400
    )
    assert client.post(reverse("auth-reset-password"), data=data).status_code == 400
    assert (
        client.post(
            reverse("customer-reset-password", kwargs={"tenant_slug": first.slug}),
            data=data,
        ).status_code
        == 200
    )
    users[1].refresh_from_db()
    assert users[1].check_password(PASSWORD)


@pytest.mark.parametrize("verification", [True, False])
def test_tokens_expire_and_email_changes_invalidate_links(
    client, monkeypatch, verification
):
    user = platform_user(email_verification_required=True)
    generator = verification_tokens if verification else reset_tokens
    route = reverse("auth-verify-email" if verification else "auth-reset-password")
    data = {**payload(user, generator), "new_password": NEW_PASSWORD}
    user.email = "changed@example.com"
    user.save(update_fields=["email"])
    assert client.post(route, data=data).status_code == 400
    data = {**payload(user, generator), "new_password": NEW_PASSWORD}
    future = generator._now() + timedelta(hours=2)
    monkeypatch.setattr(generator, "_now", lambda: future)
    assert client.post(route, data=data).status_code == 400
    assert client.post(route, data={**data, "uid": "invalid"}).status_code == 400


def test_requests_are_generic_rate_limited_and_cool_down(client):
    user = platform_user()
    route = reverse("auth-request-password-reset")
    known = client.post(route, data={"email": user.email})
    unknown = client.post(route, data={"email": "missing@example.com"})
    assert known.json() == unknown.json()
    client.post(route, data={"email": user.email})
    assert OutboundEmail.objects.count() == 1
    for _ in range(7):
        client.post(route, data={"email": "missing@example.com"})
    assert client.post(route, data={"email": "missing@example.com"}).status_code == 429


def test_store_owner_can_request_reset_from_tenant_login(client):
    user = platform_user()
    tenant = Tenant.objects.create(slug="owned")
    TenantOwner.objects.create(user=user, tenant=tenant)
    client.post(
        reverse("customer-request-password-reset", kwargs={"tenant_slug": "owned"}),
        data={"email": user.email},
    )
    email = OutboundEmail.objects.get()
    assert "https://www.stockfare.app/reset-password?" in email.body


def test_shared_owner_customer_inbox_receives_both_scoped_reset_links(
    client, django_capture_on_commit_callbacks
):
    owner = platform_user()
    tenant = Tenant.objects.create(slug="owned", name="Owned Store")
    TenantOwner.objects.create(user=owner, tenant=tenant)
    customer = User.objects.create_user(
        email=owner.email,
        password=PASSWORD,
        account_type=User.AccountType.CUSTOMER,
        tenant=tenant,
    )
    with django_capture_on_commit_callbacks(execute=True):
        response = client.post(
            reverse("customer-request-password-reset", kwargs={"tenant_slug": "owned"}),
            data={"email": owner.email.upper()},
        )
    assert response.status_code == 200
    assert len(mail.outbox) == 2
    for message in mail.outbox:
        assert message.to == [owner.email]
        link = re.search(r"https://\S+", str(message.body))
        assert link is not None
        url = urlsplit(link.group())
        data = {key: values[0] for key, values in parse_qs(url.query).items()}
        if url.hostname == "www.stockfare.app":
            assert "Stockfare owner account" in message.body
            route = reverse("auth-reset-password")
        else:
            assert url.hostname == "owned.stockfare.app"
            assert "customer account at Owned Store" in message.body
            route = reverse("customer-reset-password", kwargs={"tenant_slug": "owned"})
        assert (
            client.post(route, data={**data, "new_password": NEW_PASSWORD}).status_code
            == 200
        )
        assert (
            client.post(route, data={**data, "new_password": PASSWORD}).status_code
            == 400
        )
    for user in (owner, customer):
        user.refresh_from_db()
        assert user.check_password(NEW_PASSWORD)


def test_failed_password_reset_email_retries_with_a_working_link(
    client, monkeypatch, django_capture_on_commit_callbacks
):
    user = platform_user()
    with monkeypatch.context() as patch:
        patch.setattr(
            "accounts.emails.delivery.EmailMultiAlternatives.send",
            lambda *args, **kwargs: 0,
        )
        with django_capture_on_commit_callbacks(execute=True):
            response = client.post(
                reverse("auth-request-password-reset"), data={"email": user.email}
            )
    assert response.status_code == 200
    queued = OutboundEmail.objects.get()
    assert queued.sent_at is None
    assert queued.attempts == 1
    assert deliver_pending() == 0  # Respect the retry delay.
    OutboundEmail.objects.filter(pk=queued.pk).update(next_attempt_at=timezone.now())
    assert deliver_pending() == 1
    assert deliver_pending() == 0
    data = {
        key: values[0]
        for key, values in parse_qs(urlsplit(message_link()).query).items()
    }
    assert (
        client.post(
            reverse("auth-reset-password"), data={**data, "new_password": NEW_PASSWORD}
        ).status_code
        == 200
    )


def test_expired_reset_email_is_not_sent_and_content_is_removed(client):
    user = platform_user()
    client.post(reverse("auth-request-password-reset"), data={"email": user.email})
    queued = OutboundEmail.objects.get()
    OutboundEmail.objects.filter(pk=queued.pk).update(
        expires_at=timezone.now() - timedelta(seconds=1)
    )
    assert deliver_pending() == 0
    queued.refresh_from_db()
    assert queued.sent_at is None
    assert queued.body == queued.html_body == ""


def test_email_failure_is_retained_for_retry_without_losing_signup(
    client, monkeypatch, django_capture_on_commit_callbacks
):
    def fail(*args, **kwargs):
        raise SMTPException("provider unavailable")

    with monkeypatch.context() as patch:
        patch.setattr("accounts.emails.delivery.EmailMultiAlternatives.send", fail)
        with django_capture_on_commit_callbacks(execute=True):
            response = client.post(
                reverse("auth-signup"),
                data={
                    "email": "owner@example.com",
                    "password": PASSWORD,
                    "slug": "store",
                    "store_name": "Store",
                },
            )
    assert response.status_code == 201
    queued = OutboundEmail.objects.get()
    assert queued.sent_at is None
    assert queued.last_error == "SMTPException"
    OutboundEmail.objects.filter(pk=queued.pk).update(next_attempt_at=timezone.now())
    assert deliver_pending() == 1
    assert deliver_pending() == 0
    assert len(mail.outbox) == 1
    queued.refresh_from_db()
    assert queued.body == queued.html_body == ""


def test_rolled_back_transaction_does_not_send_email(
    django_capture_on_commit_callbacks,
):
    with django_capture_on_commit_callbacks(execute=True):
        with pytest.raises(RuntimeError), transaction.atomic():
            queue_email(
                key="rollback",
                recipient="buyer@example.com",
                subject="Test",
                body="Test",
            )
            raise RuntimeError("rollback")
    assert not OutboundEmail.objects.exists()


def test_customer_refresh_is_invalid_after_password_change(client):
    tenant = Tenant.objects.create(slug="demo", status=Tenant.Status.ACTIVE)
    user = User.objects.create_user(
        email="buyer@example.com",
        password=PASSWORD,
        account_type=User.AccountType.CUSTOMER,
        tenant=tenant,
    )
    token = RefreshToken.for_user(user)
    token["account_type"] = "customer"
    token["tenant_id"] = str(tenant.id)
    client.cookies["customer_refresh_token"] = str(token)
    user.set_password(NEW_PASSWORD)
    user.save(update_fields=["password"])
    assert (
        client.post(
            reverse("customer-auth-refresh", kwargs={"tenant_slug": "demo"})
        ).status_code
        == 401
    )
