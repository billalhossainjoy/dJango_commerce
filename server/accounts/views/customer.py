from typing import Any, cast

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from accounts.permissions import IsCustomerForTenant
from accounts.selectors import active_tenant
from accounts.serializers import (
    CustomerPasswordSerializer,
    CustomerProfileSerializer,
    CustomerSerializer,
    CustomerSignupSerializer,
    TenantTokenObtainPairSerializer,
)
from accounts.throttles import CustomerSignupThrottle, TenantLoginThrottle
from accounts.tokens import refresh_allowed, refresh_token_for
from accounts.views.platform import LoginView
from accounts.views.session import (
    RefreshCookieLogoutView,
    move_refresh_to_cookie,
)
from tenancy.models import Tenant


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


class TenantLoginView(LoginView):
    serializer_class = TenantTokenObtainPairSerializer
    throttle_classes = [TenantLoginThrottle]

    def get_serializer_context(self):
        context = dict(super().get_serializer_context())
        context["tenant"] = Tenant.objects.filter(
            slug=self.kwargs["tenant_slug"]
        ).first()
        return context


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
            if not refresh_allowed(user, old_refresh):
                raise TokenError("Account credentials have changed.")
            old_refresh.blacklist()
            refresh = refresh_token_for(user)
        except TokenError, User.DoesNotExist, KeyError:
            return Response(
                {"detail": "Refresh token is invalid."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        return move_refresh_to_cookie(
            Response({"access": str(refresh.access_token), "refresh": str(refresh)}),
            User.AccountType.CUSTOMER,
        )


class CustomerLogoutView(RefreshCookieLogoutView):
    account_type = User.AccountType.CUSTOMER


class CustomerCurrentUserView(APIView):
    permission_classes = [IsAuthenticated, IsCustomerForTenant]

    def get(self, request: Request, tenant_slug: str) -> Response:
        active_tenant(tenant_slug)
        return Response(CustomerSerializer(request.user).data)

    def patch(self, request: Request, tenant_slug: str) -> Response:
        active_tenant(tenant_slug)
        serializer = CustomerProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        customer = serializer.save()
        return Response(CustomerSerializer(customer).data)


class CustomerPasswordView(APIView):
    permission_classes = [IsAuthenticated, IsCustomerForTenant]

    def post(self, request: Request, tenant_slug: str) -> Response:
        active_tenant(tenant_slug)
        serializer = CustomerPasswordSerializer(
            data=request.data,
            context={"user": request.user},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
