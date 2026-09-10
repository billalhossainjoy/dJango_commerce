"use client";

import { useQuery } from "@tanstack/react-query";

import { AppService } from "@/app/app.service";

const appService = new AppService();

export function useTenantQuery(tenantSlug: string | null) {
  return useQuery({
    queryKey: ["tenant", tenantSlug],
    queryFn: ({ signal }) => appService.getTenantContext(tenantSlug!, signal),
    enabled: tenantSlug !== null,
  });
}
