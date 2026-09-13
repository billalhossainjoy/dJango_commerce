import { apiRequest } from "@/lib/api-client";

export type PlatformPayment = {
  id: number;
  tenant_name: string;
  tenant_slug: string;
  stripe_invoice_id: string;
  stripe_customer_id: string;
  status: "paid" | "failed";
  currency: string;
  amount_due_cents: number;
  amount_paid_cents: number;
  paid_at: string | null;
  created_at: string;
};

export function getPlatformPayments(
  accessToken: string,
  signal?: AbortSignal,
): Promise<PlatformPayment[]> {
  return apiRequest("/api/v1/platform/admin/payments/", {
    accessToken,
    signal,
  });
}
