import { apiRequest } from "@/lib/api-client";

export type StorefrontProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_cents: number;
  stock_quantity: number;
  images: Array<{
    id: string;
    url: string | null;
    alt_text: string;
    sort_order: number;
  }>;
};

function storefrontProductsPath(tenantSlug: string): string {
  return `/api/v1/tenants/${encodeURIComponent(tenantSlug)}/products/`;
}

export function listStorefrontProducts(
  tenantSlug: string,
  signal?: AbortSignal,
): Promise<StorefrontProduct[]> {
  return apiRequest(storefrontProductsPath(tenantSlug), { signal });
}

export function getStorefrontProduct(
  tenantSlug: string,
  productSlug: string,
  signal?: AbortSignal,
): Promise<StorefrontProduct> {
  return apiRequest(
    `${storefrontProductsPath(tenantSlug)}${encodeURIComponent(productSlug)}/`,
    { signal },
  );
}
