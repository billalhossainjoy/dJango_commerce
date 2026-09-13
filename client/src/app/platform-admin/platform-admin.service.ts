import { apiRequest } from "@/lib/api-client";

export type PlatformOverview = {
  tenants: {
    total: number;
    provisioning: number;
    active: number;
    suspended: number;
    closed: number;
    billing_required: number;
  };
  subscriptions: {
    total: number;
    trialing: number;
    active: number;
    past_due: number;
    canceled: number;
  };
  payments: {
    paid: number;
    failed: number;
    collected: Array<{ currency: string; amount_cents: number }>;
  };
};

export type PlatformTenantStatus =
  | "provisioning"
  | "active"
  | "suspended"
  | "closed";

export type PlatformTenant = {
  id: string;
  name: string;
  slug: string;
  status: PlatformTenantStatus;
  billing_required: boolean;
  owner_email: string;
  subscription_status: string;
  customer_count: number;
  product_count: number;
  order_count: number;
  created_at: string;
};

export function getPlatformOverview(
  accessToken: string,
  signal?: AbortSignal,
): Promise<PlatformOverview> {
  return apiRequest("/api/v1/platform/admin/overview/", {
    accessToken,
    signal,
  });
}

export function getPlatformTenants(
  accessToken: string,
  signal?: AbortSignal,
): Promise<PlatformTenant[]> {
  return apiRequest("/api/v1/platform/admin/tenants/", {
    accessToken,
    signal,
  });
}

export function getPlatformTenant(
  tenantId: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<PlatformTenant> {
  return apiRequest(
    `/api/v1/platform/admin/tenants/${encodeURIComponent(tenantId)}/`,
    { accessToken, signal },
  );
}

export function setPlatformTenantStatus(
  tenantId: string,
  status: PlatformTenantStatus,
  accessToken: string,
): Promise<Pick<PlatformTenant, "status">> {
  return apiRequest(
    `/api/v1/platform/admin/tenants/${encodeURIComponent(tenantId)}/status/`,
    {
      method: "PATCH",
      accessToken,
      body: { status },
    },
  );
}
