from typing import Any, cast

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from accounts.models import User
from accounts.permissions import IsPlatformUser
from accounts.serializers import (
    CurrentUserSerializer,
    PlatformTokenObtainPairSerializer,
    SignupSerializer,
)
from accounts.throttles import CustomerSignupThrottle
from accounts.tokens import refresh_allowed
from accounts.views.session import (
    RefreshCookieLogoutView,
    move_refresh_to_cookie,
)


class SignupView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [CustomerSignupThrottle]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformUser]

    def get(self, request: Request) -> Response:
        serializer = CurrentUserSerializer(request.user)
        return Response(serializer.data)


class LoginView(TokenObtainPairView):
    serializer_class = PlatformTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        return move_refresh_to_cookie(
            response, response.data.get("account_type", User.AccountType.PLATFORM)
        )


class RefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get(settings.JWT_PLATFORM_REFRESH_COOKIE_NAME)
        if not refresh_token:
            return Response(
                {"detail": "Refresh token cookie is missing."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            token = RefreshToken(cast(Any, refresh_token))
            platform_user = User.objects.filter(
                id=token["user_id"],
                account_type=User.AccountType.PLATFORM,
                is_active=True,
            ).first()
            platform_user_exists = platform_user is not None and refresh_allowed(
                platform_user, token
            )
        except TokenError, KeyError:
            platform_user_exists = False

        if not platform_user_exists:
            return Response(
                {"detail": "Refresh token is invalid."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        serializer = self.get_serializer(data={"refresh": refresh_token})
        serializer.is_valid(raise_exception=True)
        return move_refresh_to_cookie(Response(dict(serializer.validated_data)))


class LogoutView(RefreshCookieLogoutView):
    pass
