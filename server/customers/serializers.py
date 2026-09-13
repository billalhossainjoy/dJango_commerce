from rest_framework import serializers

from accounts.models import User


class AdminCustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "is_active", "date_joined")
        read_only_fields = ("id", "email", "date_joined")
