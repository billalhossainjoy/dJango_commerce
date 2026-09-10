import { ApiError, apiRequest } from "@/lib/api-client";

export type ProductImage = {
  id: string;
  url: string | null;
  alt_text: string;
  sort_order: number;
};

type AdminProductImage = ProductImage & {
  public_id: string;
  version: number | null;
  format: string;
  content_type: string;
  size_bytes: number;
  status: "pending" | "ready";
};

type ImageUploadIntent = {
  image: AdminProductImage;
  upload: {
    url: string;
    fields: Record<string, string | number>;
  };
};

type CloudinaryUploadResponse = {
  public_id: string;
  version: number;
  signature: string;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_cents: number;
  stock_quantity: number;
  is_active: boolean;
  images: ProductImage[];
  created_at: string;
  updated_at: string;
};

export type ProductInput = Omit<
  Product,
  "id" | "images" | "created_at" | "updated_at"
>;

function productsPath(tenantSlug: string): string {
  return `/api/v1/tenants/${encodeURIComponent(tenantSlug)}/admin/products/`;
}

function productPath(tenantSlug: string, productId: string): string {
  return `${productsPath(tenantSlug)}${encodeURIComponent(productId)}/`;
}

function productImagesPath(tenantSlug: string, productId: string): string {
  return `${productPath(tenantSlug, productId)}images`;
}

function productImagePath(
  tenantSlug: string,
  productId: string,
  imageId: string,
): string {
  return `${productImagesPath(tenantSlug, productId)}/${encodeURIComponent(imageId)}/`;
}

function isCloudinaryUploadResponse(
  value: unknown,
): value is CloudinaryUploadResponse {
  if (!value || typeof value !== "object") return false;
  const response = value as Record<string, unknown>;
  return (
    typeof response.public_id === "string" &&
    typeof response.version === "number" &&
    typeof response.signature === "string"
  );
}

export class ProductService {
  list(
    tenantSlug: string,
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<Product[]> {
    return apiRequest<Product[]>(productsPath(tenantSlug), {
      accessToken,
      signal,
    });
  }

  create(
    tenantSlug: string,
    input: ProductInput,
    accessToken: string,
  ): Promise<Product> {
    return apiRequest<Product>(productsPath(tenantSlug), {
      method: "POST",
      accessToken,
      body: input,
    });
  }

  retrieve(
    tenantSlug: string,
    productId: string,
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<Product> {
    return apiRequest<Product>(productPath(tenantSlug, productId), {
      accessToken,
      signal,
    });
  }

  update(
    tenantSlug: string,
    productId: string,
    input: ProductInput,
    accessToken: string,
  ): Promise<Product> {
    return apiRequest<Product>(productPath(tenantSlug, productId), {
      method: "PATCH",
      accessToken,
      body: input,
    });
  }

  remove(
    tenantSlug: string,
    productId: string,
    accessToken: string,
  ): Promise<void> {
    return apiRequest<void>(productPath(tenantSlug, productId), {
      method: "DELETE",
      accessToken,
    });
  }

  createImageUploadIntent(
    tenantSlug: string,
    productId: string,
    file: File,
    accessToken: string,
  ): Promise<ImageUploadIntent> {
    return apiRequest<ImageUploadIntent>(
      `${productImagesPath(tenantSlug, productId)}/upload-intent/`,
      {
        method: "POST",
        accessToken,
        body: {
          content_type: file.type,
          size_bytes: file.size,
          alt_text: file.name,
        },
      },
    );
  }

  async uploadToCloudinary(
    upload: ImageUploadIntent["upload"],
    file: File,
  ): Promise<CloudinaryUploadResponse> {
    const body = new FormData();
    Object.entries(upload.fields).forEach(([name, value]) => {
      body.append(name, String(value));
    });
    body.append("file", file);

    const response = await fetch(upload.url, {
      method: "POST",
      headers: { Accept: "application/json" },
      body,
    });
    const result: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      throw new ApiError(response.status, result);
    }
    if (!isCloudinaryUploadResponse(result)) {
      throw new Error("Cloudinary returned an invalid upload response.");
    }
    return result;
  }

  completeImageUpload(
    tenantSlug: string,
    productId: string,
    imageId: string,
    result: CloudinaryUploadResponse,
    accessToken: string,
  ): Promise<AdminProductImage> {
    return apiRequest<AdminProductImage>(
      `${productImagePath(tenantSlug, productId, imageId)}complete/`,
      {
        method: "POST",
        accessToken,
        body: {
          public_id: result.public_id,
          version: result.version,
          signature: result.signature,
        },
      },
    );
  }

  async uploadImage(
    tenantSlug: string,
    productId: string,
    file: File,
    accessToken: string,
  ): Promise<AdminProductImage> {
    const intent = await this.createImageUploadIntent(
      tenantSlug,
      productId,
      file,
      accessToken,
    );

    try {
      const result = await this.uploadToCloudinary(intent.upload, file);
      return await this.completeImageUpload(
        tenantSlug,
        productId,
        intent.image.id,
        result,
        accessToken,
      );
    } catch (uploadError) {
      try {
        await this.removeImage(
          tenantSlug,
          productId,
          intent.image.id,
          accessToken,
        );
      } catch {
        // The scheduled stale-upload cleanup retries provider or network failures.
      }
      throw uploadError;
    }
  }

  removeImage(
    tenantSlug: string,
    productId: string,
    imageId: string,
    accessToken: string,
  ): Promise<void> {
    return apiRequest<void>(
      productImagePath(tenantSlug, productId, imageId),
      {
        method: "DELETE",
        accessToken,
      },
    );
  }

  updateImageAltText(
    tenantSlug: string,
    productId: string,
    imageId: string,
    altText: string,
    accessToken: string,
  ): Promise<AdminProductImage> {
    return apiRequest<AdminProductImage>(
      productImagePath(tenantSlug, productId, imageId),
      {
        method: "PATCH",
        accessToken,
        body: { alt_text: altText },
      },
    );
  }

  makeImagePrimary(
    tenantSlug: string,
    productId: string,
    imageId: string,
    accessToken: string,
  ): Promise<AdminProductImage> {
    return apiRequest<AdminProductImage>(
      `${productImagePath(tenantSlug, productId, imageId)}primary/`,
      {
        method: "POST",
        accessToken,
      },
    );
  }
}
