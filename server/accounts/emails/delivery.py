import logging
from datetime import timedelta
from functools import partial
from uuid import UUID

from django.core.mail import EmailMultiAlternatives
from django.db import transaction
from django.db.models import Q
from django.template.loader import render_to_string
from django.utils import timezone

from accounts.models import OutboundEmail

logger = logging.getLogger(__name__)


def queue_email(
    *,
    key: str,
    recipient: str,
    subject: str,
    body: str,
    action_url: str = "",
    action_label: str = "",
    expires_at=None,
) -> None:
    message, created = OutboundEmail.objects.get_or_create(
        deduplication_key=key,
        defaults={
            "recipient": recipient,
            "subject": subject,
            "body": body,
            "html_body": render_to_string(
                "accounts/email.html",
                {
                    "subject": subject,
                    "body": body,
                    "action_url": action_url,
                    "action_label": action_label,
                },
            ),
            "expires_at": expires_at,
            "next_attempt_at": timezone.now(),
        },
    )
    if created:
        transaction.on_commit(partial(deliver_email, message.id), robust=True)


def deliver_email(message_id: UUID) -> bool:
    # Serialize attempts so concurrent requests/workers do not send the same row.
    with transaction.atomic():
        message = OutboundEmail.objects.select_for_update().get(id=message_id)
        now = timezone.now()
        if message.sent_at or message.next_attempt_at > now:
            return False
        if message.expires_at and message.expires_at <= now:
            return False
        message.attempts += 1
        email = EmailMultiAlternatives(
            message.subject,
            message.body,
            None,
            [message.recipient],
            headers={"Message-ID": f"<{message.id}@stockfare.app>"},
        )
        email.attach_alternative(message.html_body, "text/html")
        try:
            if email.send() != 1:
                raise RuntimeError("Mailer did not accept message")
        except Exception as error:
            # Do not log credentials, email addresses, or password-reset links.
            message.last_error = type(error).__name__
            message.next_attempt_at = now + timedelta(
                minutes=min(2 ** min(message.attempts, 6), 60)
            )
            logger.warning(
                "Email delivery failed: message=%s error=%s",
                message.id,
                message.last_error,
            )
        else:
            message.sent_at = now
            message.last_error = ""
            # Discard token-bearing content after successful delivery.
            message.body = ""
            message.html_body = ""
        message.save(
            update_fields=[
                "attempts",
                "next_attempt_at",
                "last_error",
                "sent_at",
                "body",
                "html_body",
            ]
        )
        return message.sent_at is not None


def deliver_pending(limit: int = 100) -> int:
    now = timezone.now()
    OutboundEmail.objects.filter(sent_at=None, expires_at__lte=now).update(
        body="", html_body=""
    )
    ids = list(
        OutboundEmail.objects.filter(sent_at=None, next_attempt_at__lte=now)
        .filter(Q(expires_at=None) | Q(expires_at__gt=now))
        .order_by("created_at")
        .values_list("id", flat=True)[:limit]
    )
    return sum(deliver_email(message_id) for message_id in ids)
