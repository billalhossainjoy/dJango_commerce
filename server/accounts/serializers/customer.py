from typing import Any

from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.db.models import Q
from rest_framework import serializers

from accounts.emails.actions import send_account_link
from accounts.models import User
from tenancy.models import Tenant
from tenancy.serializers import TenantSummarySerializer


class CustomerSerializer(serializers.ModelSerializer):
    tenant = TenantSummarySerializer(read_only=True)

    class Meta:
        model = User
        fields = ("id", "name", "email", "account_type", "tenant")


def validate_customer_email(
    value: str,
    *,
    tenant: Tenant,
    exclude_user: User | None = None,
) -> str:
    email: str = User.objects.normalize_email(value).casefold()
    users = User.objects.filter(email__iexact=email).filter(
        Q(account_type=User.AccountType.CUSTOMER, tenant=tenant)
        | Q(
            account_type=User.AccountType.PLATFORM,
            tenant_ownerships__tenant=tenant,
        )
    )
    if exclude_user is not None:
        users = users.exclude(id=exclude_user.id)
    if users.exists():
        raise serializers.ValidationError("An account with this email exists.")
    return email


class CustomerSignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ("id", "email", "password")
        read_only_fields = ("id",)

    def validate_email(self, value: str) -> str:
        return validate_customer_email(value, tenant=self.context["tenant"])

    def create(self, validated_data):
        with transaction.atomic():
            user = User.objects.create_user(
                **validated_data,
                tenant=self.context["tenant"],
                account_type=User.AccountType.CUSTOMER,
                email_verification_required=True,
            )
            send_account_link(user, verification=True)
        return user


class CustomerProfileSerializer(serializers.ModelSerializer):
    name = serializers.CharField(max_length=120)

    class Meta:
        model = User
        fields = ("name", "email")

    def validate_email(self, value: str) -> str:
        user = self.instance
        assert isinstance(user, User) and user.tenant is not None
        return validate_customer_email(
            value,
            tenant=user.tenant,
            exclude_user=user,
        )

    @transaction.atomic
    def update(self, instance, validated_data):
        changed = validated_data.get("email", instance.email) != instance.email
        if changed:
            validated_data["email_verified_at"] = None
            validated_data["email_verification_required"] = True
        user = super().update(instance, validated_data)
        if changed:
            send_account_link(user, verification=True)
        return user


class CustomerPasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(
        write_only=True, validators=[validate_password]
    )
    new_password = serializers.CharField(
        write_only=True, validators=[validate_password]
    )

    def validate_current_password(self, value: str) -> str:
        if not self.context["user"].check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate_new_password(self, value: str) -> str:
        validate_password(value, self.context["user"])
        return value

    def save(self, **kwargs: Any) -> User:
        user = self.context["user"]
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user
