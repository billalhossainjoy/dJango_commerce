from django.urls import path

from accounts.email_urls import email_urlpatterns
from accounts.views.platform import (
    CurrentUserView,
    LoginView,
    LogoutView,
    RefreshView,
    SignupView,
)

urlpatterns = email_urlpatterns("auth") + [
    path("signup/", SignupView.as_view(), name="auth-signup"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("me/", CurrentUserView.as_view(), name="auth-me"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("token/refresh/", RefreshView.as_view(), name="token-refresh"),
]
