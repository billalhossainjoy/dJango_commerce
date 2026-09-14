"""Resend HTTPS transport for deployments where outbound SMTP is unavailable."""

import hashlib
import json
from urllib.request import Request, urlopen

from django.core.mail import EmailMultiAlternatives
from django.core.mail.backends.base import BaseEmailBackend


class ResendEmailBackend(BaseEmailBackend):
    def __init__(self, *, api_key="", timeout=10, **kwargs):
        super().__init__(**kwargs)
        self.api_key = api_key
        self.timeout = timeout

    def send_messages(self, email_messages):
        sent = 0
        for message in email_messages:
            if not message.recipients():
                continue
            if not self.api_key:
                raise ValueError("RESEND_API_KEY is required")
            if message.attachments:
                raise ValueError("Attachments are not supported by this mailer")
            # Apply Django's header validation before constructing the API request.
            message.message()
            payload = {
                "from": message.from_email,
                "to": message.to,
                "subject": message.subject,
                "text": message.body,
            }
            for field in ("cc", "bcc", "reply_to"):
                if value := getattr(message, field):
                    payload[field] = value
            if message.content_subtype == "html":
                payload["html"] = payload.pop("text")
            if isinstance(message, EmailMultiAlternatives):
                for content, mimetype in message.alternatives:
                    if mimetype != "text/html":
                        raise ValueError("Unsupported email alternative")
                    payload["html"] = content
            if message.extra_headers:
                payload["headers"] = message.extra_headers
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "User-Agent": "Stockfare/1.0",
            }
            if message_id := message.extra_headers.get("Message-ID"):
                headers["Idempotency-Key"] = hashlib.sha256(
                    message_id.encode()
                ).hexdigest()
            request = Request(
                "https://api.resend.com/emails",
                data=json.dumps(payload).encode(),
                headers=headers,
                method="POST",
            )
            with urlopen(request, timeout=self.timeout) as response:
                result = json.load(response)
            if not result.get("id"):
                raise RuntimeError("Resend did not accept the message")
            sent += 1
        return sent
