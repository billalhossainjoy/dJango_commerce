from django.urls import path

from accounts.views import (
    CustomerCurrentUserView,
    CustomerLogoutView,
    CustomerRefreshView,
    CustomerSignupView,
    TenantLoginView,
)

urlpatterns = [
    path("signup/", CustomerSignupView.as_view(), name="customer-auth-signup"),
    path("login/", TenantLoginView.as_view(), name="customer-auth-login"),
    path("refresh/", CustomerRefreshView.as_view(), name="customer-auth-refresh"),
    path("logout/", CustomerLogoutView.as_view(), name="customer-auth-logout"),
    path("me/", CustomerCurrentUserView.as_view(), name="customer-auth-me"),
]
