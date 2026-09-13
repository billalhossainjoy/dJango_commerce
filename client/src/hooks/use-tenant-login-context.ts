"use client";

import { useQuery } from "@tanstack/react-query";

import { AppService } from "@/app/app.service";

const appService = new AppService();

export function tenantLoginContextQueryKey(tenantSlug: string | null) {
  return ["tenant", tenantSlug, "login-context"] as const;
}

export function useTenantLoginContext(tenantSlug: string | null) {
  return useQuery({
    queryKey: tenantLoginContextQueryKey(tenantSlug),
    queryFn: ({ signal }) =>
      appService.getTenantLoginContext(tenantSlug!, signal),
    enabled: tenantSlug !== null,
  });
}
