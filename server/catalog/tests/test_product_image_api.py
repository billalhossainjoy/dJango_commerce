from unittest.mock import patch

import pytest
from django.test import override_settings
from django.urls import reverse

from accounts.models import User
from catalog.models import Product, ProductImage
from catalog.services import SignedUpload
from catalog.tests.test_product_api import authorization_for
from tenancy.models import Tenant, TenantOwner


@pytest.mark.django_db
@patch("catalog.views.create_product_image_upload")
def test_owner_can_create_product_image_upload_intent(create_upload, client):
    owner = User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )
    tenant = Tenant.objects.create(slug="demo", name="Demo Store")
    TenantOwner.objects.create(user=owner, tenant=tenant)
    product = Product.objects.create(
        tenant=tenant,
        name="Canvas Backpack",
        slug="canvas-backpack",
        price_cents=5900,
    )
    create_upload.return_value = SignedUpload(
        url="https://api.cloudinary.com/upload",
        fields={"signature": "signed-value"},
    )

    response = client.post(
        reverse(
            "admin-product-image-upload-intent",
            kwargs={"tenant_slug": tenant.slug, "product_id": product.id},
        ),
        data={
            "content_type": "image/webp",
            "size_bytes": 2048,
            "alt_text": "Canvas backpack",
        },
        content_type="application/json",
        headers=authorization_for(owner),
    )

    assert response.status_code == 201
    image = ProductImage.objects.get()
    create_upload.assert_called_once_with(image)
    assert response.json()["image"]["id"] == str(image.id)
    assert response.json()["upload"] == {
        "url": "https://api.cloudinary.com/upload",
        "fields": {"signature": "signed-value"},
    }


@pytest.mark.django_db
@override_settings(
    CLOUDINARY_CLOUD_NAME="",
    CLOUDINARY_API_KEY="",
    CLOUDINARY_API_SECRET="",
    CLOUDINARY_UPLOAD_PRESET="",
)
def test_missing_cloudinary_configuration_returns_service_unavailable(client):
    owner = User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )
    tenant = Tenant.objects.create(slug="demo", name="Demo Store")
    TenantOwner.objects.create(user=owner, tenant=tenant)
    product = Product.objects.create(
        tenant=tenant,
        name="Canvas Backpack",
        slug="canvas-backpack",
        price_cents=5900,
    )

    response = client.post(
        reverse(
            "admin-product-image-upload-intent",
            kwargs={"tenant_slug": tenant.slug, "product_id": product.id},
        ),
        data={"content_type": "image/webp", "size_bytes": 2048},
        content_type="application/json",
        headers=authorization_for(owner),
    )

    assert response.status_code == 503
    assert response.json() == {"detail": "Product image storage is not configured."}
    assert not ProductImage.objects.exists()


@pytest.mark.django_db
@patch("catalog.views.create_product_image_upload")
def test_product_cannot_exceed_eight_images(create_upload, client):
    owner = User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )
    tenant = Tenant.objects.create(slug="demo", name="Demo Store")
    TenantOwner.objects.create(user=owner, tenant=tenant)
    product = Product.objects.create(
        tenant=tenant,
        name="Canvas Backpack",
        slug="canvas-backpack",
        price_cents=5900,
    )
    for index in range(8):
        ProductImage.objects.create(
            tenant=tenant,
            product=product,
            public_id=f"{tenant.id}/products/{product.id}/image-{index}",
            format="webp",
            content_type="image/webp",
            size_bytes=2048,
            sort_order=index,
        )

    response = client.post(
        reverse(
            "admin-product-image-upload-intent",
            kwargs={"tenant_slug": tenant.slug, "product_id": product.id},
        ),
        data={"content_type": "image/webp", "size_bytes": 2048},
        content_type="application/json",
        headers=authorization_for(owner),
    )

    assert response.status_code == 400
    assert response.json() == {"images": ["A product can have at most 8 images."]}
    assert ProductImage.objects.filter(product=product).count() == 8
    create_upload.assert_not_called()


@pytest.mark.django_db
@patch("catalog.views.create_product_image_upload")
def test_owner_cannot_create_upload_for_another_tenants_product(
    create_upload,
    client,
):
    owner = User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )
    owned_tenant = Tenant.objects.create(slug="owned", name="Owned Store")
    other_tenant = Tenant.objects.create(slug="other", name="Other Store")
    TenantOwner.objects.create(user=owner, tenant=owned_tenant)
    product = Product.objects.create(
        tenant=other_tenant,
        name="Private Product",
        slug="private-product",
        price_cents=5900,
    )

    response = client.post(
        reverse(
            "admin-product-image-upload-intent",
            kwargs={"tenant_slug": owned_tenant.slug, "product_id": product.id},
        ),
        data={"content_type": "image/png", "size_bytes": 1024},
        content_type="application/json",
        headers=authorization_for(owner),
    )

    assert response.status_code == 404
    assert not ProductImage.objects.exists()
    create_upload.assert_not_called()


@pytest.mark.django_db
@override_settings(CLOUDINARY_CLOUD_NAME="demo-cloud")
@patch("catalog.views.verify_product_image_upload", return_value=True)
def test_owner_can_complete_verified_product_image_upload(verify_upload, client):
    owner = User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )
    tenant = Tenant.objects.create(slug="demo", name="Demo Store")
    TenantOwner.objects.create(user=owner, tenant=tenant)
    product = Product.objects.create(
        tenant=tenant,
        name="Canvas Backpack",
        slug="canvas-backpack",
        price_cents=5900,
    )
    image = ProductImage.objects.create(
        tenant=tenant,
        product=product,
        public_id=f"{tenant.id}/products/{product.id}/image-id",
        format="webp",
        content_type="image/webp",
        size_bytes=2048,
    )

    response = client.post(
        reverse(
            "admin-product-image-upload-complete",
            kwargs={
                "tenant_slug": tenant.slug,
                "product_id": product.id,
                "image_id": image.id,
            },
        ),
        data={
            "public_id": image.public_id,
            "version": 123,
            "signature": "valid-signature",
        },
        content_type="application/json",
        headers=authorization_for(owner),
    )

    assert response.status_code == 200
    image.refresh_from_db()
    assert image.status == ProductImage.Status.READY
    assert image.version == 123
    assert response.json()["url"] == (
        "https://res.cloudinary.com/demo-cloud/image/upload/"
        f"v123/{image.public_id}.webp"
    )
    verify_upload.assert_called_once_with(
        image,
        public_id=image.public_id,
        version=123,
        signature="valid-signature",
    )


@pytest.mark.django_db
@override_settings(CLOUDINARY_CLOUD_NAME="demo-cloud")
@patch("catalog.views.verify_product_image_upload", return_value=False)
def test_invalid_upload_response_does_not_mark_image_ready(verify_upload, client):
    owner = User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )
    tenant = Tenant.objects.create(slug="demo", name="Demo Store")
    TenantOwner.objects.create(user=owner, tenant=tenant)
    product = Product.objects.create(
        tenant=tenant,
        name="Canvas Backpack",
        slug="canvas-backpack",
        price_cents=5900,
    )
    image = ProductImage.objects.create(
        tenant=tenant,
        product=product,
        public_id=f"{tenant.id}/products/{product.id}/image-id",
        format="webp",
        content_type="image/webp",
        size_bytes=2048,
    )

    response = client.post(
        reverse(
            "admin-product-image-upload-complete",
            kwargs={
                "tenant_slug": tenant.slug,
                "product_id": product.id,
                "image_id": image.id,
            },
        ),
        data={
            "public_id": image.public_id,
            "version": 123,
            "signature": "invalid-signature",
        },
        content_type="application/json",
        headers=authorization_for(owner),
    )

    assert response.status_code == 400
    image.refresh_from_db()
    assert image.status == ProductImage.Status.PENDING
    assert image.version is None


@pytest.mark.django_db
@override_settings(
    CLOUDINARY_CLOUD_NAME="demo-cloud",
    CLOUDINARY_API_KEY="api-key",
    CLOUDINARY_API_SECRET="api-secret",
)
@patch("catalog.services.destroy", return_value={"result": "ok"})
def test_owner_can_delete_their_product_image(destroy, client):
    owner = User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )
    tenant = Tenant.objects.create(slug="demo", name="Demo Store")
    TenantOwner.objects.create(user=owner, tenant=tenant)
    product = Product.objects.create(
        tenant=tenant,
        name="Canvas Backpack",
        slug="canvas-backpack",
        price_cents=5900,
    )
    image = ProductImage.objects.create(
        tenant=tenant,
        product=product,
        public_id=f"{tenant.id}/products/{product.id}/image-id",
        format="webp",
        content_type="image/webp",
        size_bytes=2048,
    )

    response = client.delete(
        reverse(
            "admin-product-image-detail",
            kwargs={
                "tenant_slug": tenant.slug,
                "product_id": product.id,
                "image_id": image.id,
            },
        ),
        headers=authorization_for(owner),
    )

    assert response.status_code == 204
    assert not ProductImage.objects.filter(id=image.id).exists()
    destroy.assert_called_once()


@pytest.mark.django_db
def test_owner_can_update_product_image_alt_text(client):
    owner = User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )
    tenant = Tenant.objects.create(slug="demo", name="Demo Store")
    TenantOwner.objects.create(user=owner, tenant=tenant)
    product = Product.objects.create(
        tenant=tenant,
        name="Canvas Backpack",
        slug="canvas-backpack",
        price_cents=5900,
    )
    image = ProductImage.objects.create(
        tenant=tenant,
        product=product,
        public_id=f"{tenant.id}/products/{product.id}/image-id",
        format="webp",
        content_type="image/webp",
        size_bytes=2048,
        alt_text="Original text",
    )

    response = client.patch(
        reverse(
            "admin-product-image-detail",
            kwargs={
                "tenant_slug": tenant.slug,
                "product_id": product.id,
                "image_id": image.id,
            },
        ),
        data={"alt_text": "Canvas backpack viewed from the front"},
        content_type="application/json",
        headers=authorization_for(owner),
    )

    assert response.status_code == 200
    image.refresh_from_db()
    assert image.alt_text == "Canvas backpack viewed from the front"
    assert response.json()["alt_text"] == image.alt_text


@pytest.mark.django_db
@override_settings(
    CLOUDINARY_CLOUD_NAME="demo-cloud",
    CLOUDINARY_API_KEY="api-key",
    CLOUDINARY_API_SECRET="api-secret",
)
@patch("catalog.services.destroy", return_value={"result": "unexpected"})
def test_cloudinary_delete_failure_preserves_product_image(destroy, client):
    owner = User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )
    tenant = Tenant.objects.create(slug="demo", name="Demo Store")
    TenantOwner.objects.create(user=owner, tenant=tenant)
    product = Product.objects.create(
        tenant=tenant,
        name="Canvas Backpack",
        slug="canvas-backpack",
        price_cents=5900,
    )
    image = ProductImage.objects.create(
        tenant=tenant,
        product=product,
        public_id=f"{tenant.id}/products/{product.id}/image-id",
        format="webp",
        content_type="image/webp",
        size_bytes=2048,
    )

    response = client.delete(
        reverse(
            "admin-product-image-detail",
            kwargs={
                "tenant_slug": tenant.slug,
                "product_id": product.id,
                "image_id": image.id,
            },
        ),
        headers=authorization_for(owner),
    )

    assert response.status_code == 502
    assert ProductImage.objects.filter(id=image.id).exists()


@pytest.mark.django_db
@override_settings(CLOUDINARY_CLOUD_NAME="demo-cloud")
def test_owner_can_make_ready_product_image_primary(client):
    owner = User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )
    tenant = Tenant.objects.create(slug="demo", name="Demo Store")
    TenantOwner.objects.create(user=owner, tenant=tenant)
    product = Product.objects.create(
        tenant=tenant,
        name="Canvas Backpack",
        slug="canvas-backpack",
        price_cents=5900,
    )
    images = [
        ProductImage.objects.create(
            tenant=tenant,
            product=product,
            public_id=f"{tenant.id}/products/{product.id}/image-{sort_order}",
            version=100 + sort_order,
            format="webp",
            content_type="image/webp",
            size_bytes=2048,
            sort_order=sort_order,
            status=ProductImage.Status.READY,
        )
        for sort_order in range(3)
    ]

    response = client.post(
        reverse(
            "admin-product-image-primary",
            kwargs={
                "tenant_slug": tenant.slug,
                "product_id": product.id,
                "image_id": images[1].id,
            },
        ),
        headers=authorization_for(owner),
    )

    assert response.status_code == 200
    assert response.json()["id"] == str(images[1].id)
    assert list(
        ProductImage.objects.filter(product=product).values_list("id", flat=True)
    ) == [images[1].id, images[0].id, images[2].id]


@pytest.mark.django_db
@override_settings(
    CLOUDINARY_CLOUD_NAME="demo-cloud",
    CLOUDINARY_API_KEY="api-key",
    CLOUDINARY_API_SECRET="api-secret",
)
@patch("catalog.services.destroy", return_value={"result": "ok"})
def test_deleting_product_deletes_its_cloudinary_images(destroy, client):
    owner = User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )
    tenant = Tenant.objects.create(slug="demo", name="Demo Store")
    TenantOwner.objects.create(user=owner, tenant=tenant)
    product = Product.objects.create(
        tenant=tenant,
        name="Canvas Backpack",
        slug="canvas-backpack",
        price_cents=5900,
    )
    images = [
        ProductImage.objects.create(
            tenant=tenant,
            product=product,
            public_id=f"{tenant.id}/products/{product.id}/image-{index}",
            format="webp",
            content_type="image/webp",
            size_bytes=2048,
            sort_order=index,
        )
        for index in range(2)
    ]

    response = client.delete(
        reverse(
            "admin-product-detail",
            kwargs={"tenant_slug": tenant.slug, "pk": product.id},
        ),
        headers=authorization_for(owner),
    )

    assert response.status_code == 204
    assert not Product.objects.filter(id=product.id).exists()
    assert not ProductImage.objects.filter(product_id=product.id).exists()
    assert destroy.call_count == len(images)


@pytest.mark.django_db
@override_settings(
    CLOUDINARY_CLOUD_NAME="demo-cloud",
    CLOUDINARY_API_KEY="api-key",
    CLOUDINARY_API_SECRET="api-secret",
)
@patch("catalog.services.destroy", return_value={"result": "unexpected"})
def test_product_is_preserved_when_cloudinary_cleanup_fails(destroy, client):
    owner = User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )
    tenant = Tenant.objects.create(slug="demo", name="Demo Store")
    TenantOwner.objects.create(user=owner, tenant=tenant)
    product = Product.objects.create(
        tenant=tenant,
        name="Canvas Backpack",
        slug="canvas-backpack",
        price_cents=5900,
    )
    image = ProductImage.objects.create(
        tenant=tenant,
        product=product,
        public_id=f"{tenant.id}/products/{product.id}/image",
        format="webp",
        content_type="image/webp",
        size_bytes=2048,
    )

    response = client.delete(
        reverse(
            "admin-product-detail",
            kwargs={"tenant_slug": tenant.slug, "pk": product.id},
        ),
        headers=authorization_for(owner),
    )

    assert response.status_code == 502
    assert Product.objects.filter(id=product.id).exists()
    assert ProductImage.objects.filter(id=image.id).exists()
