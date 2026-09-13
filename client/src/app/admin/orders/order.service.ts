import { apiRequest } from "@/lib/api-client";

export type AdminOrder = {
  id: string;
  status: "pending_payment" | "confirmed" | "paid" | "cancelled";
  payment_method: "cash_on_delivery";
  fulfillment_status: FulfillmentStatus;
  email: string;
  shipping_name: string;
  shipping_address_line_1: string;
  shipping_address_line_2: string;
  shipping_city: string;
  shipping_region: string;
  shipping_postal_code: string;
  shipping_country_code: string;
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

export type FulfillmentStatus =
  | "unfulfilled"
  | "processing"
  | "shipped"
  | "delivered";

export function listAdminOrders(
  tenantSlug: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<AdminOrder[]> {
  return apiRequest(
    `/api/v1/tenants/${encodeURIComponent(tenantSlug)}/admin/orders/`,
    { accessToken, signal },
  );
}

export function getAdminOrder(
  tenantSlug: string,
  orderId: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<AdminOrder> {
  return apiRequest(
    `/api/v1/tenants/${encodeURIComponent(tenantSlug)}/admin/orders/${encodeURIComponent(orderId)}/`,
    { accessToken, signal },
  );
}

export function updateOrderFulfillment(
  tenantSlug: string,
  orderId: string,
  fulfillmentStatus: FulfillmentStatus,
  accessToken: string,
): Promise<AdminOrder> {
  return apiRequest(
    `/api/v1/tenants/${encodeURIComponent(tenantSlug)}/admin/orders/${encodeURIComponent(orderId)}/status/`,
    {
      method: "PATCH",
      accessToken,
      body: { fulfillment_status: fulfillmentStatus },
    },
  );
}

export function cancelAdminOrder(
  tenantSlug: string,
  orderId: string,
  accessToken: string,
): Promise<AdminOrder> {
  return apiRequest(
    `/api/v1/tenants/${encodeURIComponent(tenantSlug)}/admin/orders/${encodeURIComponent(orderId)}/cancel/`,
    { method: "POST", accessToken },
  );
}
