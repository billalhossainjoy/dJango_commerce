from dataclasses import dataclass
from hmac import compare_digest
from time import time

from cloudinary.exceptions import Error as CloudinaryError
from cloudinary.uploader import destroy
from cloudinary.utils import api_sign_request, cloudinary_url
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

from catalog.models import ProductImage


@dataclass(frozen=True)
class SignedUpload:
    url: str
    fields: dict[str, str | int]


class ProductImageDeletionError(Exception):
    pass


def create_product_image_upload(image: ProductImage) -> SignedUpload:
    required_settings = {
        "CLOUDINARY_CLOUD_NAME": settings.CLOUDINARY_CLOUD_NAME,
        "CLOUDINARY_API_KEY": settings.CLOUDINARY_API_KEY,
        "CLOUDINARY_API_SECRET": settings.CLOUDINARY_API_SECRET,
        "CLOUDINARY_UPLOAD_PRESET": settings.CLOUDINARY_UPLOAD_PRESET,
    }
    missing = [name for name, value in required_settings.items() if not value]
    if missing:
        names = ", ".join(missing)
        raise ImproperlyConfigured(f"Missing Cloudinary settings: {names}")

    signed_fields: dict[str, str | int] = {
        "timestamp": int(time()),
        "public_id": image.public_id,
        "format": image.format,
        "overwrite": "false",
        "upload_preset": settings.CLOUDINARY_UPLOAD_PRESET,
    }
    signature = api_sign_request(signed_fields, settings.CLOUDINARY_API_SECRET)

    return SignedUpload(
        url=(
            "https://api.cloudinary.com/v1_1/"
            f"{settings.CLOUDINARY_CLOUD_NAME}/image/upload"
        ),
        fields={
            **signed_fields,
            "api_key": settings.CLOUDINARY_API_KEY,
            "signature": signature,
        },
    )


def verify_product_image_upload(
    image: ProductImage,
    *,
    public_id: str,
    version: int,
    signature: str,
) -> bool:
    if not settings.CLOUDINARY_API_SECRET:
        raise ImproperlyConfigured("Missing Cloudinary setting: CLOUDINARY_API_SECRET")
    if public_id != image.public_id:
        return False

    expected_signature = api_sign_request(
        {"public_id": public_id, "version": version},
        settings.CLOUDINARY_API_SECRET,
        signature_version=1,
    )
    return compare_digest(signature, expected_signature)


def product_image_url(image: ProductImage) -> str | None:
    if image.status != ProductImage.Status.READY or image.version is None:
        return None
    if not settings.CLOUDINARY_CLOUD_NAME:
        raise ImproperlyConfigured("Missing Cloudinary setting: CLOUDINARY_CLOUD_NAME")

    url, _ = cloudinary_url(
        image.public_id,
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        secure=True,
        version=image.version,
        format=image.format,
    )
    return url


def delete_product_image(image: ProductImage) -> None:
    required_settings = {
        "CLOUDINARY_CLOUD_NAME": settings.CLOUDINARY_CLOUD_NAME,
        "CLOUDINARY_API_KEY": settings.CLOUDINARY_API_KEY,
        "CLOUDINARY_API_SECRET": settings.CLOUDINARY_API_SECRET,
    }
    missing = [name for name, value in required_settings.items() if not value]
    if missing:
        names = ", ".join(missing)
        raise ImproperlyConfigured(f"Missing Cloudinary settings: {names}")

    try:
        response = destroy(
            image.public_id,
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
            resource_type="image",
            invalidate=True,
        )
    except CloudinaryError as error:
        raise ProductImageDeletionError from error

    if response.get("result") not in {"ok", "not found"}:
        raise ProductImageDeletionError

    image.delete()
