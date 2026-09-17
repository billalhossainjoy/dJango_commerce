import uuid

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.db.models import Q
from django.db.models.functions import Lower

from accounts.managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    class AccountType(models.TextChoices):
        PLATFORM = "platform", "Platform"
        CUSTOMER = "customer", "Customer"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenancy.Tenant",
        on_delete=models.CASCADE,
        related_name="users",
        null=True,
        blank=True,
    )

    name = models.CharField(max_length=120, blank=True)
    email = models.EmailField()
    account_type = models.CharField(max_length=20, choices=AccountType)
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    email_verified_at = models.DateTimeField(null=True, blank=True)
    # Legacy field retained for deployment compatibility; verification is optional.
    email_verification_required = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects: UserManager = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        constraints = [
            models.UniqueConstraint(
                Lower("email"),
                models.F("tenant"),
                condition=Q(account_type="customer"),
                name="unique_customer_email_per_tenant",
            ),
            models.UniqueConstraint(
                Lower("email"),
                condition=Q(account_type="platform"),
                name="unique_platform_email",
            ),
            models.CheckConstraint(
                condition=(
                    Q(account_type="platform", tenant__isnull=True)
                    | Q(account_type="customer", tenant__isnull=False)
                ),
                name="user_tenant_matches_account_type",
            ),
        ]

    def __str__(self):
        return self.email


class OutboundEmail(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    deduplication_key = models.CharField(max_length=200, unique=True)
    recipient = models.EmailField()
    subject = models.CharField(max_length=255)
    body = models.TextField()
    html_body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    attempts = models.PositiveIntegerField(default=0)
    next_attempt_at = models.DateTimeField()
    last_error = models.CharField(max_length=100, blank=True)

    class Meta:
        indexes = [models.Index(fields=["sent_at", "next_attempt_at"])]
