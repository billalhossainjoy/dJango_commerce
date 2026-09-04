from django.urls import path

from accounts.views import LoginView, LogoutView, RefreshView, SignupView

urlpatterns = [
    path("signup/", SignupView.as_view(), name="auth-signup"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("token/refresh/", RefreshView.as_view(), name="token-refresh"),
]
