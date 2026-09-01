import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.db.models.functions import Lower


class Tenant(models.Model):
    class Status(models.TextChoices):
        PROVISIONING = "provisioning", "Provisioning"
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"
        CLOSED = "closed", "Closed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(max_length=63, unique=True)
    name = models.CharField(max_length=120, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status,
        default=Status.PROVISIONING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.slug


class TenantOwner(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.OneToOneField(
        Tenant,
        on_delete=models.CASCADE,
        related_name="ownership",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="tenant_ownerships",
        limit_choices_to={"account_type": "platform"},
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email} owns {self.tenant.slug}"


class TenantHostname(models.Model):
    class Kind(models.TextChoices):
        SUBDOMAIN = "subdomain", "Platform subdomain"
        CUSTOM = "custom", "Custom domain"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="hostnames",
    )
    hostname = models.CharField(max_length=253)
    kind = models.CharField(
        max_length=20,
        choices=Kind,
        default=Kind.SUBDOMAIN,
    )
    is_canonical = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                Lower("hostname"),
                name="unique_tenant_hostname_case_insensitive",
            ),
            models.UniqueConstraint(
                fields=["tenant"],
                condition=Q(is_canonical=True),
                name="one_canonical_hostname_per_tenant",
            ),
        ]

    def __str__(self):
        return self.hostname
