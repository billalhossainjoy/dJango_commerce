from decimal import Decimal

from accounts.emails.delivery import queue_email
from orders.models import Order


def money(cents: int) -> str:
    return f"${Decimal(cents) / 100:,.2f} USD"


def queue_order_confirmation(order: Order) -> None:
    lines = [
        f"Hi {order.shipping_name},",
        "",
        f"Thank you for your order from {order.tenant.name}.",
        f"Order: #{order.id}",
        "",
    ]
    for item in order.items.all():
        lines.append(
            f"{item.product_name} × {item.quantity} — {money(item.line_total_cents)}"
        )
    lines.extend(
        [
            "",
            f"Subtotal: {money(order.subtotal_cents)}",
            f"Shipping: {money(order.shipping_cents)}",
            f"Total: {money(order.total_cents)}",
            "Payment method: Cash on delivery. Payment is due on delivery.",
            "",
            "Ship to:",
            order.shipping_name,
            order.shipping_address_line_1,
            order.shipping_address_line_2,
            f"{order.shipping_city}, {order.shipping_region} {order.shipping_postal_code}",
            order.shipping_country_code,
            "",
            "Keep this email as your order confirmation.",
        ]
    )
    queue_email(
        key=f"order-confirmation:{order.id}",
        recipient=order.email,
        subject=f"Order confirmed — #{str(order.id)[:8].upper()}",
        body="\n".join(lines),
    )
