import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q


class Cart(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenancy.Tenant",
        on_delete=models.CASCADE,
        related_name="carts",
    )
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="carts",
        null=True,
        blank=True,
        limit_choices_to={"account_type": "customer"},
    )
    session_key = models.CharField(max_length=40, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(customer__isnull=False, session_key="")
                    | (Q(customer__isnull=True) & ~Q(session_key=""))
                ),
                name="cart_has_customer_or_guest_session",
            ),
            models.UniqueConstraint(
                fields=["tenant", "customer"],
                condition=Q(customer__isnull=False),
                name="one_open_cart_per_tenant_customer",
            ),
            models.UniqueConstraint(
                fields=["tenant", "session_key"],
                condition=Q(customer__isnull=True),
                name="one_open_cart_per_tenant_guest_session",
            ),
        ]

    def __str__(self) -> str:
        owner = self.customer_id or self.session_key
        return f"Cart {self.id} ({owner})"


class CartItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product = models.ForeignKey(
        "catalog.Product",
        on_delete=models.CASCADE,
        related_name="cart_items",
    )
    quantity = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["cart", "product"],
                name="unique_product_per_cart",
            ),
            models.CheckConstraint(
                condition=Q(quantity__gte=1),
                name="cart_item_quantity_positive",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.quantity} × {self.product}"


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING_PAYMENT = "pending_payment", "Pending payment"
        PAID = "paid", "Paid"
        CANCELLED = "cancelled", "Cancelled"

    class FulfillmentStatus(models.TextChoices):
        UNFULFILLED = "unfulfilled", "Unfulfilled"
        FULFILLED = "fulfilled", "Fulfilled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenancy.Tenant",
        on_delete=models.PROTECT,
        related_name="orders",
    )
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="orders",
        null=True,
        blank=True,
        limit_choices_to={"account_type": "customer"},
    )
    idempotency_key = models.CharField(max_length=64, default=uuid.uuid4)
    session_key = models.CharField(max_length=40, blank=True, default="")
    status = models.CharField(
        max_length=20,
        choices=Status,
        default=Status.PENDING_PAYMENT,
    )
    fulfillment_status = models.CharField(
        max_length=20,
        choices=FulfillmentStatus,
        default=FulfillmentStatus.UNFULFILLED,
    )
    email = models.EmailField()
    shipping_name = models.CharField(max_length=160)
    shipping_address_line_1 = models.CharField(max_length=255)
    shipping_address_line_2 = models.CharField(max_length=255, blank=True)
    shipping_city = models.CharField(max_length=120)
    shipping_region = models.CharField(max_length=120, blank=True)
    shipping_postal_code = models.CharField(max_length=32)
    shipping_country_code = models.CharField(max_length=2)
    subtotal_cents = models.PositiveIntegerField()
    shipping_cents = models.PositiveIntegerField()
    total_cents = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["tenant", "-created_at"])]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "idempotency_key"],
                name="unique_order_idempotency_key_per_tenant",
            ),
            models.CheckConstraint(
                condition=(
                    Q(customer__isnull=False, session_key="")
                    | (Q(customer__isnull=True) & ~Q(session_key=""))
                ),
                name="order_has_customer_or_guest_session",
            ),
            models.CheckConstraint(
                condition=Q(
                    total_cents=models.F("subtotal_cents") + models.F("shipping_cents")
                ),
                name="order_total_matches_components",
            ),
        ]

    def __str__(self) -> str:
        return f"Order {self.id}"


class OrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product = models.ForeignKey(
        "catalog.Product",
        on_delete=models.SET_NULL,
        related_name="order_items",
        null=True,
        blank=True,
    )
    product_name = models.CharField(max_length=160)
    unit_price_cents = models.PositiveIntegerField()
    quantity = models.PositiveIntegerField()
    line_total_cents = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        constraints = [
            models.CheckConstraint(
                condition=Q(quantity__gte=1),
                name="order_item_quantity_positive",
            ),
            models.CheckConstraint(
                condition=Q(
                    line_total_cents=models.F("unit_price_cents") * models.F("quantity")
                ),
                name="order_item_total_matches_price_quantity",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.quantity} × {self.product_name}"
