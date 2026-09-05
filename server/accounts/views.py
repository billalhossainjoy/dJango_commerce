from typing import Any, cast

from django.conf import settings
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from accounts.models import User
from accounts.permissions import IsCustomerForTenant, IsPlatformUser
from accounts.serializers import (
    CurrentUserSerializer,
    CustomerSerializer,
    CustomerSignupSerializer,
    CustomerTokenObtainPairSerializer,
    SignupSerializer,
    customer_refresh_token,
)
from accounts.throttles import CustomerLoginThrottle, CustomerSignupThrottle
from tenancy.models import Tenant

PLATFORM_COOKIE_PATH = "/api/v1/auth/"
CUSTOMER_COOKIE_PATH = "/api/v1/tenants/"


class SignupView(APIView):
    permission_classes = [AllowAny]

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


def set_refresh_cookie(response, *, name, token, path, domain=None):
    response.set_cookie(
        key=name,
        value=token,
        max_age=settings.JWT_REFRESH_COOKIE_MAX_AGE,
        httponly=True,
        secure=settings.JWT_REFRESH_COOKIE_SECURE,
        samesite="Lax",
        path=path,
        domain=domain,
    )


def move_refresh_to_cookie(response, *, name, path, domain=None):
    refresh_token = response.data.pop("refresh")
    set_refresh_cookie(
        response,
        name=name,
        token=refresh_token,
        path=path,
        domain=domain,
    )
    return response


class LoginView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        return move_refresh_to_cookie(
            response,
            name=settings.JWT_PLATFORM_REFRESH_COOKIE_NAME,
            path=PLATFORM_COOKIE_PATH,
            domain=settings.JWT_PLATFORM_REFRESH_COOKIE_DOMAIN,
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
            platform_user_exists = User.objects.filter(
                id=token["user_id"],
                account_type=User.AccountType.PLATFORM,
                is_active=True,
            ).exists()
        except TokenError, KeyError:
            platform_user_exists = False

        if not platform_user_exists:
            return Response(
                {"detail": "Refresh token is invalid."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        serializer = self.get_serializer(data={"refresh": refresh_token})
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        rotated_refresh = data.pop("refresh", None)
        response = Response(data, status=status.HTTP_200_OK)
        if rotated_refresh:
            set_refresh_cookie(
                response,
                name=settings.JWT_PLATFORM_REFRESH_COOKIE_NAME,
                token=rotated_refresh,
                path=PLATFORM_COOKIE_PATH,
                domain=settings.JWT_PLATFORM_REFRESH_COOKIE_DOMAIN,
            )
        return response


class RefreshCookieLogoutView(APIView):
    permission_classes = [AllowAny]
    refresh_cookie_name: str
    refresh_cookie_path: str

    def get_refresh_cookie_domain(self) -> str | None:
        return None

    def post(self, request: Request, *args, **kwargs) -> Response:
        refresh_token = request.COOKIES.get(self.refresh_cookie_name)

        if refresh_token:
            try:
                RefreshToken(cast(Any, refresh_token)).blacklist()
            except TokenError:
                pass

        response = Response(status=status.HTTP_204_NO_CONTENT)
        response.delete_cookie(
            self.refresh_cookie_name,
            path=self.refresh_cookie_path,
            samesite="Lax",
            domain=self.get_refresh_cookie_domain(),
        )
        return response


class LogoutView(RefreshCookieLogoutView):
    refresh_cookie_name = settings.JWT_PLATFORM_REFRESH_COOKIE_NAME
    refresh_cookie_path = PLATFORM_COOKIE_PATH

    def get_refresh_cookie_domain(self) -> str | None:
        return settings.JWT_PLATFORM_REFRESH_COOKIE_DOMAIN


def active_tenant(tenant_slug: str) -> Tenant:
    tenant = Tenant.objects.filter(slug=tenant_slug).first()
    if tenant is None:
        raise NotFound("Store not found. Check the store address and try again.")
    if tenant.status == Tenant.Status.PROVISIONING:
        raise NotFound(
            "This store is not open yet. The store owner must activate it "
            "from their dashboard before customers can sign up or log in."
        )
    if tenant.status != Tenant.Status.ACTIVE:
        raise NotFound(
            "This store is currently unavailable. Please contact the store owner."
        )
    return tenant


class CustomerSignupView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [CustomerSignupThrottle]

    def post(self, request: Request, tenant_slug: str) -> Response:
        tenant = active_tenant(tenant_slug)
        serializer = CustomerSignupSerializer(
            data=request.data,
            context={"tenant": tenant},
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(CustomerSerializer(user).data, status=status.HTTP_201_CREATED)


class CustomerLoginView(TokenObtainPairView):
    serializer_class = CustomerTokenObtainPairSerializer
    throttle_classes = [CustomerLoginThrottle]

    def get_serializer_context(self):
        context = dict(super().get_serializer_context())
        context["tenant"] = active_tenant(self.kwargs["tenant_slug"])
        return context

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        return move_refresh_to_cookie(
            response,
            name=settings.JWT_CUSTOMER_REFRESH_COOKIE_NAME,
            path=CUSTOMER_COOKIE_PATH,
        )


class CustomerRefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request, tenant_slug: str) -> Response:
        tenant = active_tenant(tenant_slug)
        encoded_token = request.COOKIES.get(settings.JWT_CUSTOMER_REFRESH_COOKIE_NAME)
        if not encoded_token:
            return Response(
                {"detail": "Refresh token cookie is missing."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            old_refresh = RefreshToken(cast(Any, encoded_token))
            if old_refresh.get(
                "account_type"
            ) != User.AccountType.CUSTOMER or old_refresh.get("tenant_id") != str(
                tenant.id
            ):
                raise TokenError("Token does not belong to this tenant.")
            user = User.objects.select_related("tenant").get(
                id=old_refresh["user_id"],
                account_type=User.AccountType.CUSTOMER,
                tenant=tenant,
                is_active=True,
            )
            old_refresh.blacklist()
            refresh = customer_refresh_token(user)
        except TokenError, User.DoesNotExist, KeyError:
            return Response(
                {"detail": "Refresh token is invalid."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        response = Response({"access": str(refresh.access_token)})
        set_refresh_cookie(
            response,
            name=settings.JWT_CUSTOMER_REFRESH_COOKIE_NAME,
            token=str(refresh),
            path=CUSTOMER_COOKIE_PATH,
        )
        return response


class CustomerLogoutView(RefreshCookieLogoutView):
    refresh_cookie_name = settings.JWT_CUSTOMER_REFRESH_COOKIE_NAME
    refresh_cookie_path = CUSTOMER_COOKIE_PATH


class CustomerCurrentUserView(APIView):
    permission_classes = [IsAuthenticated, IsCustomerForTenant]

    def get(self, request: Request, tenant_slug: str) -> Response:
        active_tenant(tenant_slug)
        return Response(CustomerSerializer(request.user).data)
