"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getStorefrontProduct,
  listStorefrontProducts,
} from "@/app/(site)/products/product.service";

function productsQueryKey(tenantSlug: string | null) {
  return ["storefront", tenantSlug, "products"] as const;
}

export function useStorefrontProducts(tenantSlug: string | null) {
  return useQuery({
    queryKey: productsQueryKey(tenantSlug),
    queryFn: ({ signal }) => listStorefrontProducts(tenantSlug!, signal),
    enabled: tenantSlug !== null,
  });
}

export function useStorefrontProduct(
  tenantSlug: string | null,
  productSlug: string,
) {
  return useQuery({
    queryKey: [...productsQueryKey(tenantSlug), productSlug],
    queryFn: ({ signal }) =>
      getStorefrontProduct(tenantSlug!, productSlug, signal),
    enabled: Boolean(tenantSlug && productSlug),
  });
}
