from django.urls import path

from accounts.views.email import (
    RequestAccountEmailView,
    RequestVerificationView,
    ResetPasswordView,
    VerifyEmailView,
)


def email_urlpatterns(prefix: str):
    return [
        path(
            "email/verification/",
            RequestVerificationView.as_view(),
            name=f"{prefix}-request-verification",
        ),
        path("email/verify/", VerifyEmailView.as_view(), name=f"{prefix}-verify-email"),
        path(
            "password/reset/",
            RequestAccountEmailView.as_view(),
            name=f"{prefix}-request-password-reset",
        ),
        path(
            "password/reset/confirm/",
            ResetPasswordView.as_view(),
            name=f"{prefix}-reset-password",
        ),
    ]
