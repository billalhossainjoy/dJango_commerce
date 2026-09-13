from collections.abc import Mapping
from typing import Any, cast

from django.db import transaction
from django.db.models import Prefetch
from rest_framework.exceptions import ValidationError
from rest_framework.request import Request

from accounts.models import User
from catalog.models import Product, ProductImage
from orders.models import Cart, CartItem, Order, OrderItem
from tenancy.models import Tenant

FLAT_SHIPPING_CENTS = 500


def cart_queryset():
    return Cart.objects.prefetch_related(
        Prefetch(
            "items__product__images",
            queryset=ProductImage.objects.filter(status=ProductImage.Status.READY),
            to_attr="ready_images",
        )
    )


def get_request_cart(
    request: Request,
    tenant: Tenant,
    *,
    create: bool,
) -> Cart | None:
    if request.user.is_authenticated:
        customer = cast(User, request.user)
        if create:
            cart, _ = Cart.objects.get_or_create(tenant=tenant, customer=customer)
            return cart
        return cart_queryset().filter(tenant=tenant, customer=customer).first()

    session_key = request.session.session_key
    if not session_key and create:
        request.session.create()
        session_key = request.session.session_key
    if not session_key:
        return None

    if create:
        cart, _ = Cart.objects.get_or_create(
            tenant=tenant,
            customer=None,
            session_key=session_key,
        )
        return cart
    return cart_queryset().filter(tenant=tenant, session_key=session_key).first()


@transaction.atomic
def create_order_from_cart(
    *,
    tenant: Tenant,
    cart: Cart,
    customer: User | None,
    idempotency_key: str,
    shipping: Mapping[str, Any],
) -> Order:
    cart = Cart.objects.select_for_update().get(id=cart.id, tenant=tenant)
    cart_items = list(
        CartItem.objects.select_for_update().filter(cart=cart).order_by("created_at")
    )
    if not cart_items:
        raise ValidationError({"cart": "Your cart is empty."})

    products = {
        product.id: product
        for product in Product.objects.select_for_update().filter(
            id__in=[item.product_id for item in cart_items],
            tenant=tenant,
        )
    }
    subtotal_cents = 0
    order_items: list[OrderItem] = []
    for item in cart_items:
        product = products.get(item.product_id)
        if product is None or not product.is_active:
            raise ValidationError({"cart": "A product in your cart is unavailable."})
        if item.quantity > product.stock_quantity:
            raise ValidationError(
                {"cart": f"Only {product.stock_quantity} of {product.name} remain."}
            )
        line_total_cents = product.price_cents * item.quantity
        subtotal_cents += line_total_cents
        order_items.append(
            OrderItem(
                product=product,
                product_name=product.name,
                unit_price_cents=product.price_cents,
                quantity=item.quantity,
                line_total_cents=line_total_cents,
            )
        )

    order = Order.objects.create(
        tenant=tenant,
        customer=customer,
        idempotency_key=idempotency_key,
        session_key="" if customer else cart.session_key,
        subtotal_cents=subtotal_cents,
        shipping_cents=FLAT_SHIPPING_CENTS,
        total_cents=subtotal_cents + FLAT_SHIPPING_CENTS,
        **shipping,
    )
    for order_item in order_items:
        order_item.order = order
    OrderItem.objects.bulk_create(order_items)

    for item in cart_items:
        product = products[item.product_id]
        product.stock_quantity -= item.quantity
        product.save(update_fields=["stock_quantity", "updated_at"])

    cart.delete()
    return order


@transaction.atomic
def cancel_order(order: Order) -> Order:
    order = Order.objects.select_for_update().get(id=order.id)
    if order.status == Order.Status.CANCELLED:
        return order
    if order.status != Order.Status.CONFIRMED:
        raise ValidationError({"status": "This order cannot be cancelled."})
    if order.fulfillment_status not in {
        Order.FulfillmentStatus.UNFULFILLED,
        Order.FulfillmentStatus.PROCESSING,
    }:
        raise ValidationError(
            {"status": "An order cannot be cancelled after it has shipped."}
        )

    items = list(order.items.exclude(product__isnull=True))
    products = {
        product.id: product
        for product in Product.objects.select_for_update().filter(
            id__in=[item.product_id for item in items]
        )
    }
    for item in items:
        product = products.get(item.product_id)
        if product:
            product.stock_quantity += item.quantity
            product.save(update_fields=["stock_quantity", "updated_at"])

    order.status = Order.Status.CANCELLED
    order.save(update_fields=["status", "updated_at"])
    return order
