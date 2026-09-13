import { apiRequest } from "@/lib/api-client";

export type CreateOrderInput = {
  email: string;
  shipping_name: string;
  shipping_address_line_1: string;
  shipping_address_line_2: string;
  shipping_city: string;
  shipping_region: string;
  shipping_postal_code: string;
  shipping_country_code: string;
};

export type Order = {
  id: string;
  status: "pending_payment" | "confirmed" | "paid" | "cancelled";
  payment_method: "cash_on_delivery";
  fulfillment_status: "unfulfilled" | "fulfilled";
  email: string;
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  items: Array<{
    id: string;
    product_id: string | null;
    product_name: string;
    unit_price_cents: number;
    quantity: number;
    line_total_cents: number;
  }>;
  created_at: string;
};

export function createOrder(
  tenantSlug: string,
  input: CreateOrderInput,
  idempotencyKey: string,
  accessToken?: string | null,
): Promise<Order> {
  return apiRequest(
    `/api/v1/tenants/${encodeURIComponent(tenantSlug)}/orders/`,
    {
      method: "POST",
      accessToken: accessToken ?? undefined,
      headers: { "Idempotency-Key": idempotencyKey },
      body: input,
    },
  );
}

export function getOrder(
  tenantSlug: string,
  orderId: string,
  accessToken?: string | null,
  signal?: AbortSignal,
): Promise<Order> {
  return apiRequest(
    `/api/v1/tenants/${encodeURIComponent(tenantSlug)}/orders/${encodeURIComponent(orderId)}/`,
    {
      accessToken: accessToken ?? undefined,
      signal,
    },
  );
}
