from django.db import models


class TenantSubscription(models.Model):
    class Status(models.TextChoices):
        NOT_STARTED = "not_started", "Not started"
        INCOMPLETE = "incomplete", "Incomplete"
        INCOMPLETE_EXPIRED = "incomplete_expired", "Incomplete expired"
        TRIALING = "trialing", "Trialing"
        ACTIVE = "active", "Active"
        PAST_DUE = "past_due", "Past due"
        CANCELED = "canceled", "Canceled"
        UNPAID = "unpaid", "Unpaid"
        PAUSED = "paused", "Paused"

    tenant = models.OneToOneField(
        "tenancy.Tenant",
        on_delete=models.CASCADE,
        related_name="subscription",
    )
    stripe_customer_id = models.CharField(
        max_length=255,
        unique=True,
        null=True,
        blank=True,
    )
    stripe_subscription_id = models.CharField(
        max_length=255,
        unique=True,
        null=True,
        blank=True,
    )
    stripe_checkout_session_id = models.CharField(
        max_length=255,
        unique=True,
        null=True,
        blank=True,
    )
    status = models.CharField(
        max_length=30,
        choices=Status,
        default=Status.NOT_STARTED,
    )
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    current_period_ends_at = models.DateTimeField(null=True, blank=True)
    cancel_at_period_end = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def has_access(self) -> bool:
        return self.status in {self.Status.TRIALING, self.Status.ACTIVE}

    def __str__(self) -> str:
        return f"{self.tenant.slug}: {self.status}"


class StripeWebhookEvent(models.Model):
    id = models.CharField(max_length=255, primary_key=True)
    event_type = models.CharField(max_length=255)
    livemode = models.BooleanField(default=False)
    processed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.id
