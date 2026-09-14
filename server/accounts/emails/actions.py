from datetime import timedelta
from urllib.parse import urlencode, urlsplit, urlunsplit
from uuid import uuid4

from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.exceptions import ImproperlyConfigured
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from accounts.emails.delivery import queue_email
from accounts.models import OutboundEmail, User


class VerificationTokenGenerator(PasswordResetTokenGenerator):
    key_salt = "accounts.email_verification"

    def _make_hash_value(self, user, timestamp):
        return (
            f"{user.pk}{user.email}{user.password}{user.email_verified_at}{timestamp}"
        )


class ResetTokenGenerator(PasswordResetTokenGenerator):
    key_salt = "accounts.password_reset"


verification_tokens = VerificationTokenGenerator()
reset_tokens = ResetTokenGenerator()


def frontend_origin(user: User) -> str:
    origin = urlsplit(settings.PLATFORM_FRONTEND_ORIGIN)
    if origin.scheme not in {"http", "https"} or not origin.hostname:
        raise ImproperlyConfigured(
            "PLATFORM_FRONTEND_ORIGIN must be an HTTP(S) origin."
        )
    if user.account_type == User.AccountType.PLATFORM:
        return urlunsplit((origin.scheme, origin.netloc, "", "", ""))
    assert user.tenant is not None
    hostname = f"{user.tenant.slug}.{settings.PLATFORM_ROOT_DOMAIN}"
    port = f":{origin.port}" if origin.port else ""
    return f"{origin.scheme}://{hostname}{port}"


def send_account_link(user: User, *, verification: bool) -> None:
    if not user.is_active or not user.has_usable_password():
        return
    if verification and user.email_verified_at:
        return
    kind = "verify" if verification else "reset"
    # Persistent per-account cooldown supplements the public request throttles.
    prefix = f"{kind}:{user.id}:"
    if OutboundEmail.objects.filter(
        deduplication_key__startswith=prefix,
        created_at__gte=timezone.now() - timedelta(minutes=1),
    ).exists():
        return
    generator = verification_tokens if verification else reset_tokens
    path = "verify-email" if verification else "reset-password"
    query = urlencode(
        {
            "uid": urlsafe_base64_encode(force_bytes(user.pk)),
            "token": generator.make_token(user),
        }
    )
    url = f"{frontend_origin(user)}/{path}?{query}"
    subject = "Verify your email address" if verification else "Reset your password"
    purpose = "verify your email address" if verification else "choose a new password"
    body = (
        f"Hi {user.name or 'there'},\n\n"
        f"Use the link below to {purpose}:\n\n{url}\n\n"
        "This link expires in one hour and can only be used once.\n\n"
        "If you did not request this email, you can ignore it."
    )
    queue_email(
        key=f"{prefix}{uuid4()}",
        recipient=user.email,
        subject=subject,
        body=body,
        action_url=url,
        action_label=subject,
        expires_at=timezone.now() + timedelta(seconds=settings.PASSWORD_RESET_TIMEOUT),
    )
