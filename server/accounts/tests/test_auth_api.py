import pytest
from django.urls import reverse

from accounts.models import User


@pytest.mark.django_db
def test_user_can_signup_login_refresh_and_logout(client):
    signup_response = client.post(
        reverse("auth-signup"),
        data={
            "email": "user@example.com",
            "password": "strong-test-password-123",
        },
    )

    assert signup_response.status_code == 201
    assert signup_response.json()["email"] == "user@example.com"
    assert "password" not in signup_response.json()

    user = User.objects.get(email="user@example.com")
    assert user.account_type == User.AccountType.PLATFORM
    assert not user.is_staff
    assert not user.is_superuser

    login_response = client.post(
        reverse("auth-login"),
        data={"email": "user@example.com", "password": "strong-test-password-123"},
    )

    assert login_response.status_code == 200
    assert login_response.json()["access"]
    assert "refresh" not in login_response.json()
    refresh_cookie = login_response.cookies["refresh_token"]
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
