import { apiRequest } from "@/lib/api-client";

export type SubscriptionStatus =
  | "not_started"
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "paused";

export type Subscription = {
  status: SubscriptionStatus;
  has_access: boolean;
  can_manage: boolean;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
  cancel_at_period_end: boolean;
};

function billingPath(tenantSlug: string) {
  return `/api/v1/tenants/${encodeURIComponent(tenantSlug)}/admin/billing/`;
}

export function getSubscription(
  tenantSlug: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<Subscription> {
  return apiRequest(billingPath(tenantSlug), { accessToken, signal });
}

export function createSubscriptionCheckout(
  tenantSlug: string,
  accessToken: string,
): Promise<{ checkout_url: string }> {
  return apiRequest(`${billingPath(tenantSlug)}checkout/`, {
    method: "POST",
    accessToken,
  });
}

export function createBillingPortal(
  tenantSlug: string,
  accessToken: string,
): Promise<{ portal_url: string }> {
  return apiRequest(`${billingPath(tenantSlug)}portal/`, {
    method: "POST",
    accessToken,
  });
}
