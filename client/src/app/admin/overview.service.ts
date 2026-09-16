import type {
  AdminOrder,
  FulfillmentStatus,
} from "@/app/admin/orders/order.service";
import { apiRequest } from "@/lib/api-client";

export type OverviewPeriod = 7 | 30 | 90;
export type DailyActivity = {
  date: string;
  orders: number;
  order_value_cents: number;
};
export type TenantOverview = {
  days: OverviewPeriod;
  timezone: string;
  products: {
    total: number;
    active: number;
    out_of_stock: number;
    low_stock: number;
  };
  total_orders: number;
  customers: number;
  period: { orders: number; order_value_cents: number };
  daily: DailyActivity[];
  fulfillment: { status: FulfillmentStatus; count: number }[];
  recent_orders: Pick<
    AdminOrder,
    "id" | "shipping_name" | "status" | "total_cents" | "created_at"
  >[];
};

export function getTenantOverview(
  tenantSlug: string,
  days: OverviewPeriod,
  accessToken: string,
  signal?: AbortSignal,
): Promise<TenantOverview> {
  return apiRequest(
    `/api/v1/tenants/${encodeURIComponent(tenantSlug)}/admin/overview/?days=${days}`,
    { accessToken, signal },
  );
}
