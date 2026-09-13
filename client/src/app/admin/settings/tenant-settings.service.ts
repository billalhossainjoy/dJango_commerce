import { apiRequest } from "@/lib/api-client";

export type TenantSettings = {
  name: string;
  slug: string;
  subdomain: string;
};

function settingsPath(tenantSlug: string) {
  return `/api/v1/tenants/${encodeURIComponent(tenantSlug)}/admin/settings/`;
}

export function getTenantSettings(
  tenantSlug: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<TenantSettings> {
  return apiRequest(settingsPath(tenantSlug), { accessToken, signal });
}

export function updateTenantSettings(
  tenantSlug: string,
  accessToken: string,
  settings: Pick<TenantSettings, "name" | "slug">,
): Promise<TenantSettings> {
  return apiRequest(settingsPath(tenantSlug), {
    method: "PATCH",
    accessToken,
    body: settings,
  });
}
