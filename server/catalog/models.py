import uuid

from django.db import models
from django.db.models import Q


class Product(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenancy.Tenant",
        on_delete=models.CASCADE,
        related_name="products",
    )
    name = models.CharField(max_length=160)
    slug = models.SlugField(max_length=160)
    description = models.TextField(blank=True)
    price_cents = models.PositiveIntegerField()
    stock_quantity = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "slug"],
                name="unique_product_slug_per_tenant",
            ),
            models.CheckConstraint(
                condition=Q(price_cents__gte=0),
                name="product_price_cents_nonnegative",
            ),
            models.CheckConstraint(
                condition=Q(stock_quantity__gte=0),
                name="product_stock_quantity_nonnegative",
            ),
        ]

    def __str__(self) -> str:
        return self.name
