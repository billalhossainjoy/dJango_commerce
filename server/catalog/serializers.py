import uuid

from rest_framework import serializers

from catalog.models import Product, ProductImage
from catalog.services import product_image_url
from tenancy.models import Tenant

MAX_PRODUCT_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
MAX_PRODUCT_IMAGES = 8
PRODUCT_IMAGE_FORMATS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


class ProductImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ("id", "url", "alt_text", "sort_order")

    def get_url(self, image: ProductImage) -> str | None:
        return product_image_url(image)


class ProductSerializer(serializers.ModelSerializer):
    images = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "price_cents",
            "stock_quantity",
            "is_active",
            "images",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def get_images(self, product: Product):
        images = getattr(product, "ready_images", None)
        if images is None:
            images = product.images.filter(status=ProductImage.Status.READY)
        return ProductImageSerializer(images, many=True).data


class ProductImageUploadIntentSerializer(serializers.ModelSerializer):
    content_type = serializers.ChoiceField(
        choices=tuple(PRODUCT_IMAGE_FORMATS),
    )
    size_bytes = serializers.IntegerField(
        min_value=1,
        max_value=MAX_PRODUCT_IMAGE_SIZE_BYTES,
    )

    class Meta:
        model = ProductImage
        fields = (
            "content_type",
            "size_bytes",
            "alt_text",
        )

    def validate(self, attrs):
        product: Product = self.context["product"]
        if product.images.count() >= MAX_PRODUCT_IMAGES:
            raise serializers.ValidationError(
                {"images": f"A product can have at most {MAX_PRODUCT_IMAGES} images."}
            )
        return attrs

    def create(self, validated_data):
        tenant: Tenant = self.context["tenant"]
        product: Product = self.context["product"]
        image_id = uuid.uuid4()
        content_type = validated_data["content_type"]
        return ProductImage.objects.create(
            id=image_id,
            **validated_data,
            tenant=tenant,
            product=product,
            public_id=f"{tenant.id}/products/{product.id}/{image_id}",
            format=PRODUCT_IMAGE_FORMATS[content_type],
            sort_order=product.images.count(),
        )


class AdminProductImageSerializer(ProductImageSerializer):
    class Meta:
        model = ProductImage
        fields = (
            "id",
            "url",
            "alt_text",
            "sort_order",
            "public_id",
            "version",
            "format",
            "content_type",
            "size_bytes",
            "status",
        )


class ProductImageAltTextSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ("alt_text",)


class ProductImageUploadCompletionSerializer(serializers.Serializer):
    public_id = serializers.CharField(max_length=1024)
    version = serializers.IntegerField(min_value=1)
    signature = serializers.CharField(trim_whitespace=False)
