from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from django.utils.http import urlsafe_base64_decode
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)

from accounts.emails.actions import reset_tokens, send_account_link, verification_tokens
from accounts.models import User
from accounts.selectors import scoped_users
from accounts.serializers.email import EmailInput, LinkInput, ResetInput
from accounts.throttles import EmailActionThrottle


class EmailActionView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [EmailActionThrottle]


class RequestAccountEmailView(EmailActionView):
    verification = False

    def post(self, request, tenant_slug: str | None = None):
        serializer = EmailInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            # Lock the user while checking the cooldown and creating the outbox row.
            users = list(
                scoped_users(tenant_slug).filter(
                    email__iexact=serializer.validated_data["email"]
                )[:2]
            )
            if len(users) == 1:
                user = User.objects.select_for_update().get(pk=users[0].pk)
                send_account_link(user, verification=self.verification)
        return Response(
            {
                "detail": "If an eligible account exists, an email will be sent. Check your inbox and spam folder."
            }
        )


class RequestVerificationView(RequestAccountEmailView):
    verification = True


def link_user(data, tenant_slug: str | None) -> User | None:
    try:
        uid = urlsafe_base64_decode(data["uid"]).decode()
        return (
            User.objects.select_for_update()
            .filter(pk=uid, pk__in=scoped_users(tenant_slug).values("pk"))
            .first()
        )
    except ValueError, UnicodeError, DjangoValidationError, OverflowError:
        pass
    return None


class VerifyEmailView(EmailActionView):
    def post(self, request, tenant_slug: str | None = None):
        serializer = LinkInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            user = link_user(serializer.validated_data, tenant_slug)
            if (
                user is None
                or user.email_verified_at
                or not verification_tokens.check_token(
                    user, serializer.validated_data["token"]
                )
            ):
                return Response(
                    {
                        "detail": "This verification link is invalid or has expired."
                    },
                    status=400,
                )
            user.email_verified_at = timezone.now()
            user.save(update_fields=["email_verified_at"])
        return Response({"detail": "Your email is verified. You can now sign in."})


class ResetPasswordView(EmailActionView):
    def post(self, request, tenant_slug: str | None = None):
        serializer = ResetInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            user = link_user(serializer.validated_data, tenant_slug)
            if user is None or not reset_tokens.check_token(
                user, serializer.validated_data["token"]
            ):
                return Response(
                    {
                        "detail": "This reset link is invalid or has expired. Request a new email."
                    },
                    status=400,
                )
            try:
                validate_password(serializer.validated_data["new_password"], user)
            except DjangoValidationError as error:
                return Response({"new_password": error.messages}, status=400)
            user.set_password(serializer.validated_data["new_password"])
            user.save(update_fields=["password"])
            for token in OutstandingToken.objects.filter(user=user):
                BlacklistedToken.objects.get_or_create(token=token)
        return Response(
            {"detail": "Your password has been reset. Sign in with your new password."}
        )
