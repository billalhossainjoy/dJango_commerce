import io
import json
from email.message import Message
from unittest.mock import patch
from urllib.error import HTTPError

import pytest
from django.core.mail import EmailMultiAlternatives

from accounts.emails.backend import ResendEmailBackend


def message():
    email = EmailMultiAlternatives(
        "Verify your email",
        "Verification link",
        "Stockfare <hello@example.com>",
        ["customer@example.com"],
        headers={"Message-ID": "<stable-outbox-id@example.com>"},
    )
    email.attach_alternative("<p>Verification link</p>", "text/html")
    return email


def test_resend_payload_and_retry_idempotency():
    backend = ResendEmailBackend(api_key="test-key")
    with patch("accounts.emails.backend.urlopen") as request:
        request.side_effect = [io.BytesIO(b'{"id":"accepted"}') for _ in range(2)]
        assert backend.send_messages([message()]) == 1
        assert backend.send_messages([message()]) == 1
    first, second = [call.args[0] for call in request.call_args_list]
    assert first.full_url == "https://api.resend.com/emails"
    assert first.get_header("Authorization") == "Bearer test-key"
    assert first.get_header("Idempotency-key") == second.get_header("Idempotency-key")
    body = json.loads(first.data)
    assert body["from"] == "Stockfare <hello@example.com>"
    assert body["to"] == ["customer@example.com"]
    assert body["text"] == "Verification link"
    assert body["html"] == "<p>Verification link</p>"
    assert request.call_args.kwargs["timeout"] == 10


def test_resend_errors_propagate_to_outbox():
    backend = ResendEmailBackend(api_key="test-key")
    error = HTTPError(
        "https://api.resend.com/emails", 429, "Rate limited", Message(), None
    )
    with patch("accounts.emails.backend.urlopen", side_effect=error):
        with pytest.raises(HTTPError):
            backend.send_messages([message()])
    with patch("accounts.emails.backend.urlopen", return_value=io.BytesIO(b"{}")):
        with pytest.raises(RuntimeError, match="did not accept"):
            backend.send_messages([message()])


def test_resend_requires_credentials_and_recipients():
    backend = ResendEmailBackend()
    with pytest.raises(ValueError, match="RESEND_API_KEY"):
        backend.send_messages([message()])
    email = message()
    email.to = []
    assert backend.send_messages([email]) == 0
