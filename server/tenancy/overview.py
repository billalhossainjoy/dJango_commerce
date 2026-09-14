from datetime import date, datetime, time, timedelta

from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from accounts.models import User
from orders.models import Order
from tenancy.models import Tenant


def tenant_overview(tenant: Tenant, days: int) -> dict:
    today = timezone.localdate()
    start = today - timedelta(days=days - 1)
    start_at = timezone.make_aware(datetime.combine(start, time.min))
    end_at = timezone.make_aware(datetime.combine(today + timedelta(days=1), time.min))
    orders = Order.objects.filter(tenant=tenant)
    period_orders = orders.filter(created_at__gte=start_at, created_at__lt=end_at)
    accepted = Q(status__in=[Order.Status.CONFIRMED, Order.Status.PAID])
    products = tenant.products.aggregate(
        total=Count("id"),
        active=Count("id", filter=Q(is_active=True)),
        out_of_stock=Count("id", filter=Q(is_active=True, stock_quantity=0)),
        low_stock=Count(
            "id", filter=Q(is_active=True, stock_quantity__gte=1, stock_quantity__lte=5)
        ),
    )
    period = period_orders.aggregate(
        orders=Count("id"),
        order_value_cents=Sum("total_cents", filter=accepted, default=0),
    )
    daily: dict[date, dict[str, int]] = {
        row["date"]: {
            "orders": row["orders"],
            "order_value_cents": row["order_value_cents"],
        }
        for row in period_orders.order_by()
        .annotate(date=TruncDate("created_at"))
        .values("date")
        .annotate(
            orders=Count("id"),
            order_value_cents=Sum("total_cents", filter=accepted, default=0),
        )
    }
    fulfillment = dict(
        orders.filter(accepted)
        .order_by()
        .values("fulfillment_status")
        .annotate(count=Count("id"))
        .values_list("fulfillment_status", "count")
    )
    return {
        "days": days,
        "timezone": timezone.get_current_timezone_name(),
        "products": products,
        "total_orders": orders.count(),
        "customers": User.objects.filter(
            tenant=tenant, account_type=User.AccountType.CUSTOMER
        ).count(),
        "period": period,
        "daily": [
            {
                "date": (day := start + timedelta(days=offset)).isoformat(),
                "orders": daily.get(day, {}).get("orders", 0),
                "order_value_cents": daily.get(day, {}).get("order_value_cents", 0),
            }
            for offset in range(days)
        ],
        "fulfillment": [
            {"status": status, "count": fulfillment.get(status, 0)}
            for status in Order.FulfillmentStatus.values
        ],
        "recent_orders": list(
            orders.order_by("-created_at", "-id").values(
                "id", "shipping_name", "status", "total_cents", "created_at"
            )[:5]
        ),
    }
