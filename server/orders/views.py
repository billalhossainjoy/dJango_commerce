import uuid
from typing import cast

from django.db import transaction
from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsCustomerForTenant, IsPlatformUser
from catalog.models import Product
from orders.models import Cart, CartItem, Order
from orders.permissions import IsGuestOrTenantCustomer
from orders.serializers import (
    AddCartItemSerializer,
    AdminOrderStatusSerializer,
    CartSerializer,
    CreateOrderSerializer,
    OrderSerializer,
    UpdateCartItemSerializer,
)
from orders.services import (
    cancel_order,
    cart_queryset,
    create_order_from_cart,
    get_request_cart,
)
from tenancy.models import Tenant


def active_tenant(tenant_slug: str) -> Tenant:
    return get_object_or_404(
        Tenant,
        slug=tenant_slug,
        status=Tenant.Status.ACTIVE,
    )


def empty_cart() -> dict[str, object]:
    return {"id": None, "items": [], "item_count": 0, "subtotal_cents": 0}


def order_owner_filter(request: Request) -> dict[str, object]:
    if request.user.is_authenticated:
        return {"customer": cast(User, request.user)}
    return {"customer": None, "session_key": request.session.session_key or ""}


def current_cart(request: Request, tenant_slug: str) -> Cart:
    cart = get_request_cart(request, active_tenant(tenant_slug), create=False)
    if cart is None:
        raise Http404
    return cart


class CartDetailView(APIView):
    permission_classes = [IsGuestOrTenantCustomer]

    def get(self, request: Request, tenant_slug: str) -> Response:
        cart = get_request_cart(request, active_tenant(tenant_slug), create=False)
        return Response(CartSerializer(cart).data if cart else empty_cart())


class CartItemCreateView(APIView):
    permission_classes = [IsGuestOrTenantCustomer]

    def post(self, request: Request, tenant_slug: str) -> Response:
        serializer = AddCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            tenant = active_tenant(tenant_slug)
            product = get_object_or_404(
                Product.objects.select_for_update(),
                id=serializer.validated_data["product_id"],
                tenant=tenant,
                is_active=True,
            )
            cart = get_request_cart(request, tenant, create=False)
            item = None
            if cart:
                item = (
                    CartItem.objects.select_for_update()
                    .filter(cart=cart, product=product)
                    .first()
                )
            quantity = serializer.validated_data["quantity"] + (
                item.quantity if item else 0
            )
            if quantity > product.stock_quantity:
                raise ValidationError(
                    {"quantity": "The requested quantity is not available."}
                )
            if cart is None:
                cart = get_request_cart(request, tenant, create=True)
                assert cart is not None
            CartItem.objects.update_or_create(
                cart=cart,
                product=product,
                defaults={"quantity": quantity},
            )

        cart = get_object_or_404(cart_queryset(), id=cart.id)
        return Response(CartSerializer(cart).data, status=status.HTTP_201_CREATED)


class CartItemDetailView(APIView):
    permission_classes = [IsGuestOrTenantCustomer]

    def patch(
        self,
        request: Request,
        tenant_slug: str,
        item_id: uuid.UUID,
    ) -> Response:
        serializer = UpdateCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            cart = current_cart(request, tenant_slug)
            item = get_object_or_404(
                CartItem.objects.select_for_update().select_related("product"),
                id=item_id,
                cart=cart,
            )
            quantity = serializer.validated_data["quantity"]
            if not item.product.is_active:
                raise ValidationError({"product": "This product is unavailable."})
            if quantity > item.product.stock_quantity:
                raise ValidationError(
                    {"quantity": "The requested quantity is not available."}
                )
            item.quantity = quantity
            item.save(update_fields=["quantity", "updated_at"])

        cart = get_object_or_404(cart_queryset(), id=cart.id)
        return Response(CartSerializer(cart).data)

    def delete(
        self,
        request: Request,
        tenant_slug: str,
        item_id: uuid.UUID,
    ) -> Response:
        cart = current_cart(request, tenant_slug)
        item = get_object_or_404(CartItem, id=item_id, cart=cart)
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CartClaimView(APIView):
    permission_classes = [IsAuthenticated, IsCustomerForTenant]

    def post(self, request: Request, tenant_slug: str) -> Response:
        tenant = active_tenant(tenant_slug)
        customer = cast(User, request.user)

        with transaction.atomic():
            customer_cart, _ = Cart.objects.get_or_create(
                tenant=tenant,
                customer=customer,
            )
            session_key = request.session.session_key
            guest_cart = None
            if session_key:
                guest_cart = (
                    Cart.objects.select_for_update()
                    .filter(
                        tenant=tenant,
                        customer=None,
                        session_key=session_key,
                    )
                    .first()
                )

            if guest_cart:
                guest_items = guest_cart.items.select_related("product")
                for guest_item in guest_items:
                    product = guest_item.product
                    if not product.is_active or product.stock_quantity == 0:
                        continue
                    customer_item = (
                        CartItem.objects.select_for_update()
                        .filter(cart=customer_cart, product=product)
                        .first()
                    )
                    quantity = min(
                        guest_item.quantity
                        + (customer_item.quantity if customer_item else 0),
                        product.stock_quantity,
                        99,
                    )
                    CartItem.objects.update_or_create(
                        cart=customer_cart,
                        product=product,
                        defaults={"quantity": quantity},
                    )
                guest_cart.delete()

        customer_cart = get_object_or_404(cart_queryset(), id=customer_cart.id)
        return Response(CartSerializer(customer_cart).data)


class OrderCreateView(APIView):
    permission_classes = [IsGuestOrTenantCustomer]

    def post(self, request: Request, tenant_slug: str) -> Response:
        tenant = active_tenant(tenant_slug)
        idempotency_key = request.headers.get("Idempotency-Key", "").strip()
        if not idempotency_key or len(idempotency_key) > 64:
            raise ValidationError(
                {"idempotency_key": "Provide a valid Idempotency-Key header."}
            )

        existing_order = (
            Order.objects.prefetch_related("items")
            .filter(
                tenant=tenant,
                idempotency_key=idempotency_key,
                **order_owner_filter(request),
            )
            .first()
        )
        if existing_order:
            return Response(OrderSerializer(existing_order).data)

        serializer = CreateOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cart = get_request_cart(request, tenant, create=False)
        if cart is None:
            raise ValidationError({"cart": "Your cart is empty."})
        customer = cast(User, request.user) if request.user.is_authenticated else None
        order = create_order_from_cart(
            tenant=tenant,
            cart=cart,
            customer=customer,
            idempotency_key=idempotency_key,
            shipping=serializer.validated_data,
        )
        order = Order.objects.prefetch_related("items").get(id=order.id)
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderDetailView(APIView):
    permission_classes = [IsGuestOrTenantCustomer]

    def get(
        self,
        request: Request,
        tenant_slug: str,
        order_id: uuid.UUID,
    ) -> Response:
        order = get_object_or_404(
            Order.objects.prefetch_related("items"),
            id=order_id,
            tenant=active_tenant(tenant_slug),
            **order_owner_filter(request),
        )
        return Response(OrderSerializer(order).data)


def admin_orders(tenant_slug: str, owner: User):
    tenant = get_object_or_404(
        Tenant,
        slug=tenant_slug,
        ownership__user=owner,
    )
    return Order.objects.filter(tenant=tenant).prefetch_related("items")


class AdminOrderListView(ListAPIView):
    permission_classes = [IsAuthenticated, IsPlatformUser]
    serializer_class = OrderSerializer

    def get_queryset(self):
        return admin_orders(
            self.kwargs["tenant_slug"],
            cast(User, self.request.user),
        )


class AdminOrderDetailView(RetrieveAPIView):
    permission_classes = [IsAuthenticated, IsPlatformUser]
    serializer_class = OrderSerializer
    lookup_url_kwarg = "order_id"

    def get_queryset(self):
        return admin_orders(
            self.kwargs["tenant_slug"],
            cast(User, self.request.user),
        )


class AdminOrderStatusView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformUser]

    def patch(
        self,
        request: Request,
        tenant_slug: str,
        order_id: uuid.UUID,
    ) -> Response:
        owner = cast(User, request.user)
        with transaction.atomic():
            order = get_object_or_404(
                admin_orders(tenant_slug, owner).select_for_update(),
                id=order_id,
            )
            serializer = AdminOrderStatusSerializer(
                order,
                data=request.data,
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()

        order = Order.objects.prefetch_related("items").get(id=order.id)
        return Response(OrderSerializer(order).data)


class AdminOrderCancelView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformUser]

    def post(
        self,
        request: Request,
        tenant_slug: str,
        order_id: uuid.UUID,
    ) -> Response:
        order = get_object_or_404(
            admin_orders(tenant_slug, cast(User, request.user)),
            id=order_id,
        )
        order = cancel_order(order)
        order = Order.objects.prefetch_related("items").get(id=order.id)
        return Response(OrderSerializer(order).data)
