from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from accounts.models import User


class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ("id", "email", "password")
        read_only_fields = ("id",)

    def validate_email(self, value: str) -> str:
        email: str = User.objects.normalize_email(value).casefold()
        if User.objects.filter(
            email__iexact=email,
            account_type=User.AccountType.PLATFORM,
        ).exists():
            raise serializers.ValidationError("An account with this email exists.")
        return email

    def validate_password(self, value: str) -> str:
        validate_password(value)
        return value

    def create(self, validated_data):
        return User.objects.create_user(
            **validated_data,
            account_type=User.AccountType.PLATFORM,
        )
