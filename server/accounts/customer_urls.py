from django.urls import path

from accounts.email_urls import email_urlpatterns
from accounts.views.customer import (
    CustomerCurrentUserView,
    CustomerLogoutView,
    CustomerPasswordView,
    CustomerRefreshView,
    CustomerSignupView,
    TenantLoginView,
)

urlpatterns = email_urlpatterns("customer") + [
    path("signup/", CustomerSignupView.as_view(), name="customer-auth-signup"),
    path("login/", TenantLoginView.as_view(), name="customer-auth-login"),
    path("refresh/", CustomerRefreshView.as_view(), name="customer-auth-refresh"),
    path("logout/", CustomerLogoutView.as_view(), name="customer-auth-logout"),
    path("me/", CustomerCurrentUserView.as_view(), name="customer-auth-me"),
    path(
        "password/",
        CustomerPasswordView.as_view(),
        name="customer-auth-password",
    ),
]
