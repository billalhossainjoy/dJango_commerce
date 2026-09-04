import { ApiError } from "@/app/app.service";

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
  async list(
    tenantSlug: string,
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<Product[]> {
    const encodedSlug = encodeURIComponent(tenantSlug);
    const response = await fetch(
      `/api/v1/tenants/${encodedSlug}/admin/products/`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        signal,
      },
    );

    if (!response.ok) {
      const details = await response.json().catch(() => null);
      throw new ApiError(response.status, details);
    }

    return (await response.json()) as Product[];
  }

  async create(
    tenantSlug: string,
    input: ProductInput,
    accessToken: string,
  ): Promise<Product> {
    const encodedSlug = encodeURIComponent(tenantSlug);
    const response = await fetch(
      `/api/v1/tenants/${encodedSlug}/admin/products/`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      },
    );

    if (!response.ok) {
      const details = await response.json().catch(() => null);
      throw new ApiError(response.status, details);
    }

    return (await response.json()) as Product;
  }
}
