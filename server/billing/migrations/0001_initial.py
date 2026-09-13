from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = [("tenancy", "0006_one_tenant_per_owner")]

    operations = [
        migrations.CreateModel(
            name="StripeWebhookEvent",
            fields=[
                ("id", models.CharField(max_length=255, primary_key=True, serialize=False)),
                ("event_type", models.CharField(max_length=255)),
                ("livemode", models.BooleanField(default=False)),
                ("processed_at", models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.CreateModel(
            name="TenantSubscription",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("stripe_customer_id", models.CharField(blank=True, max_length=255, null=True, unique=True)),
                ("stripe_subscription_id", models.CharField(blank=True, max_length=255, null=True, unique=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("not_started", "Not started"),
                            ("incomplete", "Incomplete"),
                            ("incomplete_expired", "Incomplete expired"),
                            ("trialing", "Trialing"),
                            ("active", "Active"),
                            ("past_due", "Past due"),
                            ("canceled", "Canceled"),
                            ("unpaid", "Unpaid"),
                            ("paused", "Paused"),
                        ],
                        default="not_started",
                        max_length=30,
                    ),
                ),
                ("trial_ends_at", models.DateTimeField(blank=True, null=True)),
                ("current_period_ends_at", models.DateTimeField(blank=True, null=True)),
                ("cancel_at_period_end", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "tenant",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="subscription",
                        to="tenancy.tenant",
                    ),
                ),
            ],
        ),
    ]
