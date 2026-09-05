import { apiRequest } from "@/lib/api-client";

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_cents: number;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductInput = Omit<Product, "id" | "created_at" | "updated_at">;

export class ProductService {
  list(
    tenantSlug: string,
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<Product[]> {
    const encodedSlug = encodeURIComponent(tenantSlug);
    return apiRequest<Product[]>(
      `/api/v1/tenants/${encodedSlug}/admin/products/`,
      {
        accessToken,
        signal,
      },
    );
  }

  create(
    tenantSlug: string,
    input: ProductInput,
    accessToken: string,
  ): Promise<Product> {
    const encodedSlug = encodeURIComponent(tenantSlug);
    return apiRequest<Product>(
      `/api/v1/tenants/${encodedSlug}/admin/products/`,
      {
        method: "POST",
        accessToken,
        body: input,
      },
    );
  }

  retrieve(
    tenantSlug: string,
    productId: string,
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<Product> {
    const encodedSlug = encodeURIComponent(tenantSlug);
    const encodedId = encodeURIComponent(productId);
    return apiRequest<Product>(
      `/api/v1/tenants/${encodedSlug}/admin/products/${encodedId}/`,
      { accessToken, signal },
    );
  }

  update(
    tenantSlug: string,
    productId: string,
    input: ProductInput,
    accessToken: string,
  ): Promise<Product> {
    const encodedSlug = encodeURIComponent(tenantSlug);
    const encodedId = encodeURIComponent(productId);
    return apiRequest<Product>(
      `/api/v1/tenants/${encodedSlug}/admin/products/${encodedId}/`,
      {
        method: "PATCH",
        accessToken,
        body: input,
      },
    );
  }

  remove(
    tenantSlug: string,
    productId: string,
    accessToken: string,
  ): Promise<void> {
    const encodedSlug = encodeURIComponent(tenantSlug);
    const encodedId = encodeURIComponent(productId);
    return apiRequest<void>(
      `/api/v1/tenants/${encodedSlug}/admin/products/${encodedId}/`,
      {
        method: "DELETE",
        accessToken,
      },
    );
  }
}
