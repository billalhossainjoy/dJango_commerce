import uuid
from typing import Any, cast

from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from django.db.models import Prefetch
from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.generics import (
    ListAPIView,
    ListCreateAPIView,
    RetrieveAPIView,
    RetrieveUpdateDestroyAPIView,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsPlatformUser
from catalog.models import Product, ProductImage
from catalog.serializers import (
    AdminProductImageSerializer,
    ProductImageAltTextSerializer,
    ProductImageUploadCompletionSerializer,
    ProductImageUploadIntentSerializer,
    ProductSerializer,
)
from catalog.services import (
    ProductImageDeletionError,
    create_product_image_upload,
    delete_product_image,
    verify_product_image_upload,
)
from tenancy.models import Tenant


class OwnedTenantMixin:
    request: Any
    kwargs: dict[str, str]

    def get_tenant(self) -> Tenant:
        user = cast(User, self.request.user)
        tenant = Tenant.objects.filter(
            slug=self.kwargs["tenant_slug"],
            ownership__user=user,
        ).first()
        if tenant is None:
            raise Http404
        return tenant


def products_with_ready_images():
    return Product.objects.prefetch_related(
        Prefetch(
            "images",
            queryset=ProductImage.objects.filter(status=ProductImage.Status.READY),
            to_attr="ready_images",
        )
    )


def public_products(tenant_slug: str):
    return products_with_ready_images().filter(
        tenant__slug=tenant_slug,
        tenant__status=Tenant.Status.ACTIVE,
        is_active=True,
    )


class ProductImageStorageUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "Product image storage is not configured."


class ProductImageDeletionFailed(APIException):
    status_code = status.HTTP_502_BAD_GATEWAY
    default_detail = "Cloudinary could not delete this image. Please try again."


def remove_product_image(image: ProductImage) -> None:
    try:
        delete_product_image(image)
    except ImproperlyConfigured as error:
        raise ProductImageStorageUnavailable from error
    except ProductImageDeletionError as error:
        raise ProductImageDeletionFailed from error


class PublicProductListView(ListAPIView):
    serializer_class = ProductSerializer

    def get_queryset(self):
        return public_products(self.kwargs["tenant_slug"])


class PublicProductDetailView(RetrieveAPIView):
    serializer_class = ProductSerializer
    lookup_field = "slug"
    lookup_url_kwarg = "product_slug"

    def get_queryset(self):
        return public_products(self.kwargs["tenant_slug"])


class AdminProductListCreateView(OwnedTenantMixin, ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsPlatformUser]
    serializer_class = ProductSerializer

    def get_queryset(self):
        return products_with_ready_images().filter(tenant=self.get_tenant())

    def perform_create(self, serializer):
        serializer.save(tenant=self.get_tenant())


class AdminProductDetailView(OwnedTenantMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, IsPlatformUser]
    serializer_class = ProductSerializer

    def get_queryset(self):
        return products_with_ready_images().filter(tenant=self.get_tenant())

    def perform_destroy(self, instance: Product) -> None:
        for image in list(instance.images.all()):
            remove_product_image(image)
        instance.delete()


class AdminProductImageUploadIntentView(OwnedTenantMixin, APIView):
    permission_classes = [IsAuthenticated, IsPlatformUser]

    def post(
        self,
        request: Request,
        tenant_slug: str,
        product_id: uuid.UUID,
    ) -> Response:
        tenant = self.get_tenant()

        try:
            with transaction.atomic():
                product = get_object_or_404(
                    Product.objects.select_for_update(),
                    id=product_id,
                    tenant=tenant,
                )
                serializer = ProductImageUploadIntentSerializer(
                    data=request.data,
                    context={"tenant": tenant, "product": product},
                )
                serializer.is_valid(raise_exception=True)
                image = serializer.save()
                upload = create_product_image_upload(image)
        except ImproperlyConfigured as error:
            raise ProductImageStorageUnavailable from error

        return Response(
            {
                "image": AdminProductImageSerializer(image).data,
                "upload": {
                    "url": upload.url,
                    "fields": upload.fields,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class AdminProductImageUploadCompleteView(OwnedTenantMixin, APIView):
    permission_classes = [IsAuthenticated, IsPlatformUser]

    def post(
        self,
        request: Request,
        tenant_slug: str,
        product_id: uuid.UUID,
        image_id: uuid.UUID,
    ) -> Response:
        tenant = self.get_tenant()
        completion = ProductImageUploadCompletionSerializer(data=request.data)
        completion.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                image = get_object_or_404(
                    ProductImage.objects.select_for_update(),
                    id=image_id,
                    product_id=product_id,
                    tenant=tenant,
                )
                if not verify_product_image_upload(image, **completion.validated_data):
                    raise ValidationError(
                        {"signature": "Invalid Cloudinary upload response."}
                    )
                image.version = completion.validated_data["version"]
                image.status = ProductImage.Status.READY
                image.save(update_fields=("version", "status", "updated_at"))
        except ImproperlyConfigured as error:
            raise ProductImageStorageUnavailable from error

        return Response(AdminProductImageSerializer(image).data)


class AdminProductImageDetailView(OwnedTenantMixin, APIView):
    permission_classes = [IsAuthenticated, IsPlatformUser]

    def patch(
        self,
        request: Request,
        tenant_slug: str,
        product_id: uuid.UUID,
        image_id: uuid.UUID,
    ) -> Response:
        image = get_object_or_404(
            ProductImage,
            id=image_id,
            product_id=product_id,
            tenant=self.get_tenant(),
        )
        serializer = ProductImageAltTextSerializer(
            image,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(AdminProductImageSerializer(image).data)

    def delete(
        self,
        request: Request,
        tenant_slug: str,
        product_id: uuid.UUID,
        image_id: uuid.UUID,
    ) -> Response:
        tenant = self.get_tenant()
        image = get_object_or_404(
            ProductImage,
            id=image_id,
            product_id=product_id,
            tenant=tenant,
        )

        remove_product_image(image)

        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminProductImagePrimaryView(OwnedTenantMixin, APIView):
    permission_classes = [IsAuthenticated, IsPlatformUser]

    def post(
        self,
        request: Request,
        tenant_slug: str,
        product_id: uuid.UUID,
        image_id: uuid.UUID,
    ) -> Response:
        tenant = self.get_tenant()

        with transaction.atomic():
            images = list(
                ProductImage.objects.select_for_update().filter(
                    product_id=product_id,
                    tenant=tenant,
                    status=ProductImage.Status.READY,
                )
            )
            image = next((item for item in images if item.id == image_id), None)
            if image is None:
                raise Http404

            ordered_images = [image, *(item for item in images if item.id != image_id)]
            for sort_order, item in enumerate(ordered_images):
                item.sort_order = sort_order
            ProductImage.objects.bulk_update(ordered_images, ("sort_order",))

        return Response(AdminProductImageSerializer(image).data)
