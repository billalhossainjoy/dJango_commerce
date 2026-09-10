from unittest.mock import patch

import pytest
from django.db import OperationalError
from django.urls import reverse


def test_health_returns_ok(client):
    response = client.get(reverse("api-health"))

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_rejects_unsupported_methods(client):
    response = client.post(reverse("api-health"))

    assert response.status_code == 405


@pytest.mark.django_db
def test_readiness_returns_ready_when_database_is_available(client):
    response = client.get(reverse("api-readiness"))

    assert response.status_code == 200
    assert response.json() == {"status": "ready"}


def test_readiness_returns_unavailable_when_database_fails(client):
    with patch("config.views.connection.cursor", side_effect=OperationalError):
        response = client.get(reverse("api-readiness"))

    assert response.status_code == 503
    assert response.json() == {"status": "unavailable"}
