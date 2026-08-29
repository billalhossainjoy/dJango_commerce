import pytest
from django.urls import reverse


@pytest.mark.django_db
def test_admin_redirects_anonymous_user_to_login(client):
    admin_url = reverse("admin:index")
    login_url = reverse("admin:login")

    response = client.get(admin_url)

    assert response.status_code == 302
    assert response.url.startswith(login_url)
