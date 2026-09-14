from typing import Any, cast

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User


def refresh_cookie_options(account_type=User.AccountType.PLATFORM):
    if account_type == User.AccountType.CUSTOMER:
        return {
            "key": settings.JWT_CUSTOMER_REFRESH_COOKIE_NAME,
            "path": "/api/v1/tenants/",
            "domain": None,
        }
    return {
        "key": settings.JWT_PLATFORM_REFRESH_COOKIE_NAME,
        "path": "/api/v1/auth/",
        "domain": settings.JWT_PLATFORM_REFRESH_COOKIE_DOMAIN,
    }


def move_refresh_to_cookie(response, account_type=User.AccountType.PLATFORM):
    if token := response.data.pop("refresh", None):
        response.set_cookie(
            **refresh_cookie_options(account_type),
            value=token,
            max_age=settings.JWT_REFRESH_COOKIE_MAX_AGE,
            httponly=True,
            secure=settings.JWT_REFRESH_COOKIE_SECURE,
            samesite="Lax",
        )
    return response


class RefreshCookieLogoutView(APIView):
    permission_classes = [AllowAny]
    account_type = User.AccountType.PLATFORM

    def post(self, request: Request, *args, **kwargs) -> Response:
        cookie = refresh_cookie_options(self.account_type)
        refresh_token = request.COOKIES.get(cookie["key"])

        if refresh_token:
            try:
                RefreshToken(cast(Any, refresh_token)).blacklist()
            except TokenError:
                pass

        response = Response(status=status.HTTP_204_NO_CONTENT)
        response.delete_cookie(
            **cookie,
            samesite="Lax",
        )
        return response
