import logging

from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import status
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
    CustomerLoginSerializer,
    CustomerSerializer,
    CustomerSignupSerializer,
    SignupSerializer,
    customer_refresh_token,
)
from accounts.throttles import CustomerLoginThrottle, CustomerSignupThrottle
from tenancy.models import Tenant

logger = logging.getLogger(__name__)


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


def set_refresh_cookie(response, name, refresh_token, path):
    response.set_cookie(
        key=name,
        value=refresh_token,
        max_age=settings.JWT_REFRESH_COOKIE_MAX_AGE,
        httponly=True,
        secure=settings.JWT_REFRESH_COOKIE_SECURE,
        samesite="Lax",
        path=path,
    )


class LoginView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        refresh_token = response.data.pop("refresh")
        set_refresh_cookie(
            response,
            settings.JWT_PLATFORM_REFRESH_COOKIE_NAME,
            refresh_token,
            "/api/v1/auth/",
        )
        return response


class RefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get(settings.JWT_PLATFORM_REFRESH_COOKIE_NAME)
        if not refresh_token:
            return Response(
                {"detail": "Refresh token cookie is missing."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            token = RefreshToken(refresh_token)  # type: ignore[arg-type]
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
                settings.JWT_PLATFORM_REFRESH_COOKIE_NAME,
                rotated_refresh,
                "/api/v1/auth/",
            )
        return response


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        refresh_token = request.COOKIES.get(settings.JWT_PLATFORM_REFRESH_COOKIE_NAME)

        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()  # type: ignore[arg-type]
            except TokenError:
                pass

        response = Response(status=status.HTTP_204_NO_CONTENT)
        response.delete_cookie(
            settings.JWT_PLATFORM_REFRESH_COOKIE_NAME,
            path="/api/v1/auth/",
            samesite="Lax",
        )
        return response


def active_tenant(tenant_slug: str) -> Tenant:
    return get_object_or_404(
        Tenant,
        slug=tenant_slug,
        status=Tenant.Status.ACTIVE,
    )


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


class CustomerLoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [CustomerLoginThrottle]

    def post(self, request: Request, tenant_slug: str) -> Response:
        tenant = active_tenant(tenant_slug)
        credentials = CustomerLoginSerializer(data=request.data)
        credentials.is_valid(raise_exception=True)
        email = User.objects.normalize_email(
            credentials.validated_data["email"]
        ).casefold()
        password = credentials.validated_data["password"]
        user = User.objects.filter(
            email__iexact=email,
            account_type=User.AccountType.CUSTOMER,
            tenant=tenant,
        ).first()

        if user is None:
            User().set_password(password)

        if user is None or not user.check_password(password) or not user.is_active:
            logger.warning(
                "Customer login failed",
                extra={"tenant_slug": tenant_slug},
            )
            return Response(
                {"detail": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = customer_refresh_token(user)
        response = Response({"access": str(refresh.access_token)})
        set_refresh_cookie(
            response,
            settings.JWT_CUSTOMER_REFRESH_COOKIE_NAME,
            str(refresh),
            "/api/v1/tenants/",
        )
        return response


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
            old_refresh = RefreshToken(encoded_token)  # type: ignore[arg-type]
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
            old_refresh.blacklist()  # type: ignore[arg-type]
            refresh = customer_refresh_token(user)
        except TokenError, User.DoesNotExist, KeyError:
            return Response(
                {"detail": "Refresh token is invalid."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        response = Response({"access": str(refresh.access_token)})
        set_refresh_cookie(
            response,
            settings.JWT_CUSTOMER_REFRESH_COOKIE_NAME,
            str(refresh),
            "/api/v1/tenants/",
        )
        return response


class CustomerLogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request, tenant_slug: str) -> Response:
        encoded_token = request.COOKIES.get(settings.JWT_CUSTOMER_REFRESH_COOKIE_NAME)
        if encoded_token:
            try:
                RefreshToken(encoded_token).blacklist()  # type: ignore[arg-type]
            except TokenError:
                pass

        response = Response(status=status.HTTP_204_NO_CONTENT)
        response.delete_cookie(
            settings.JWT_CUSTOMER_REFRESH_COOKIE_NAME,
            path="/api/v1/tenants/",
            samesite="Lax",
        )
        return response


class CustomerCurrentUserView(APIView):
    permission_classes = [IsAuthenticated, IsCustomerForTenant]

    def get(self, request: Request, tenant_slug: str) -> Response:
        active_tenant(tenant_slug)
        return Response(CustomerSerializer(request.user).data)
