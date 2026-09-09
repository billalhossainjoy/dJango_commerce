import type { StorefrontProduct } from "@/app/(site)/products/product.service";
import { apiRequest } from "@/lib/api-client";

export type CartItem = {
  id: string;
  product: StorefrontProduct;
  quantity: number;
  line_total_cents: number;
};

export type Cart = {
  id: string | null;
  items: CartItem[];
  item_count: number;
  subtotal_cents: number;
};

function cartPath(tenantSlug: string): string {
  return `/api/v1/tenants/${encodeURIComponent(tenantSlug)}/cart/`;
}

function cartItemsPath(tenantSlug: string): string {
  return `${cartPath(tenantSlug)}items/`;
}

export function getCart(
  tenantSlug: string,
  accessToken?: string | null,
  signal?: AbortSignal,
): Promise<Cart> {
  return apiRequest(cartPath(tenantSlug), {
    accessToken: accessToken ?? undefined,
    signal,
  });
}

export function claimCart(
  tenantSlug: string,
  accessToken: string,
): Promise<Cart> {
  return apiRequest(`${cartPath(tenantSlug)}claim/`, {
    method: "POST",
    accessToken,
  });
}

export function addCartItem(
  tenantSlug: string,
  productId: string,
  quantity: number,
  accessToken?: string | null,
): Promise<Cart> {
  return apiRequest(cartItemsPath(tenantSlug), {
    method: "POST",
    accessToken: accessToken ?? undefined,
    body: { product_id: productId, quantity },
  });
}

export function updateCartItem(
  tenantSlug: string,
  itemId: string,
  quantity: number,
  accessToken?: string | null,
): Promise<Cart> {
  return apiRequest(`${cartItemsPath(tenantSlug)}${encodeURIComponent(itemId)}/`, {
    method: "PATCH",
    accessToken: accessToken ?? undefined,
    body: { quantity },
  });
}

export function removeCartItem(
  tenantSlug: string,
  itemId: string,
  accessToken?: string | null,
): Promise<void> {
  return apiRequest(`${cartItemsPath(tenantSlug)}${encodeURIComponent(itemId)}/`, {
    method: "DELETE",
    accessToken: accessToken ?? undefined,
  });
}
