from rest_framework import serializers

from catalog.serializers import ProductSerializer
from orders.models import Cart, CartItem, Order, OrderItem


class AddCartItemSerializer(serializers.Serializer):
    product_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1, max_value=99, default=1)


class UpdateCartItemSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1, max_value=99)


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    line_total_cents = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ("id", "product", "quantity", "line_total_cents")

    def get_line_total_cents(self, item: CartItem) -> int:
        return item.product.price_cents * item.quantity


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    item_count = serializers.SerializerMethodField()
    subtotal_cents = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ("id", "items", "item_count", "subtotal_cents")

    def get_item_count(self, cart: Cart) -> int:
        return sum(item.quantity for item in cart.items.all())

    def get_subtotal_cents(self, cart: Cart) -> int:
        return sum(
            item.product.price_cents * item.quantity for item in cart.items.all()
        )


class CreateOrderSerializer(serializers.Serializer):
    email = serializers.EmailField()
    shipping_name = serializers.CharField(max_length=160)
    shipping_address_line_1 = serializers.CharField(max_length=255)
    shipping_address_line_2 = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
        default="",
    )
    shipping_city = serializers.CharField(max_length=120)
    shipping_region = serializers.CharField(
        max_length=120,
        required=False,
        allow_blank=True,
        default="",
    )
    shipping_postal_code = serializers.CharField(max_length=32)
    shipping_country_code = serializers.CharField(min_length=2, max_length=2)

    def validate_shipping_country_code(self, value: str) -> str:
        return value.upper()


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = (
            "id",
            "product_id",
            "product_name",
            "unit_price_cents",
            "quantity",
            "line_total_cents",
        )


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "status",
            "fulfillment_status",
            "email",
            "shipping_name",
            "shipping_address_line_1",
            "shipping_address_line_2",
            "shipping_city",
            "shipping_region",
            "shipping_postal_code",
            "shipping_country_code",
            "subtotal_cents",
            "shipping_cents",
            "total_cents",
            "items",
            "created_at",
        )
