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


def cloudinary_settings(*names: str) -> dict[str, str]:
    values = {name: getattr(settings, name) for name in names}
    missing = [
        name
        for name, value in values.items()
        if not value or value.startswith("replace-with-")
    ]
    if missing:
        raise ImproperlyConfigured(f"Missing Cloudinary settings: {', '.join(missing)}")
    return values


def create_product_image_upload(image: ProductImage) -> SignedUpload:
    configured = cloudinary_settings(
        "CLOUDINARY_CLOUD_NAME",
        "CLOUDINARY_API_KEY",
        "CLOUDINARY_API_SECRET",
        "CLOUDINARY_UPLOAD_PRESET",
    )

    signed_fields: dict[str, str | int] = {
        "timestamp": int(time()),
        "public_id": image.public_id,
        "format": image.format,
        "overwrite": "false",
        "upload_preset": configured["CLOUDINARY_UPLOAD_PRESET"],
    }
    signature = api_sign_request(signed_fields, configured["CLOUDINARY_API_SECRET"])

    return SignedUpload(
        url=(
            "https://api.cloudinary.com/v1_1/"
            f"{configured['CLOUDINARY_CLOUD_NAME']}/image/upload"
        ),
        fields={
            **signed_fields,
            "api_key": configured["CLOUDINARY_API_KEY"],
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
    configured = cloudinary_settings("CLOUDINARY_API_SECRET")
    if public_id != image.public_id:
        return False

    expected_signature = api_sign_request(
        {"public_id": public_id, "version": version},
        configured["CLOUDINARY_API_SECRET"],
        signature_version=1,
    )
    return compare_digest(signature, expected_signature)


def product_image_url(image: ProductImage) -> str | None:
    if image.status != ProductImage.Status.READY or image.version is None:
        return None
    configured = cloudinary_settings("CLOUDINARY_CLOUD_NAME")

    url, _ = cloudinary_url(
        image.public_id,
        cloud_name=configured["CLOUDINARY_CLOUD_NAME"],
        secure=True,
        version=image.version,
        format=image.format,
    )
    return url


def delete_product_image(image: ProductImage) -> None:
    configured = cloudinary_settings(
        "CLOUDINARY_CLOUD_NAME",
        "CLOUDINARY_API_KEY",
        "CLOUDINARY_API_SECRET",
    )

    try:
        response = destroy(
            image.public_id,
            cloud_name=configured["CLOUDINARY_CLOUD_NAME"],
            api_key=configured["CLOUDINARY_API_KEY"],
            api_secret=configured["CLOUDINARY_API_SECRET"],
            resource_type="image",
            invalidate=True,
        )
    except CloudinaryError as error:
        raise ProductImageDeletionError from error

    if response.get("result") not in {"ok", "not found"}:
        raise ProductImageDeletionError

    image.delete()
