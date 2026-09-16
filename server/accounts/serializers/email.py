from rest_framework import serializers


class EmailInput(serializers.Serializer):
    email = serializers.EmailField(max_length=254)


class LinkInput(serializers.Serializer):
    uid = serializers.CharField(max_length=100)
    token = serializers.CharField(max_length=128)


class ResetInput(LinkInput):
    new_password = serializers.CharField(
        write_only=True, max_length=128, trim_whitespace=False
    )
