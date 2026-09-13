"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getPlatformTenant,
  getPlatformTenants,
  type PlatformTenant,
  type PlatformTenantStatus,
  setPlatformTenantStatus,
} from "@/app/platform-admin/platform-admin.service";
import { useAuthStore } from "@/stores/auth-store";

const tenantQueryKey = ["platform-admin", "tenants"] as const;

export function usePlatformTenant(tenantId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: [...tenantQueryKey, tenantId],
    queryFn: ({ signal }) =>
      getPlatformTenant(tenantId, accessToken!, signal),
    enabled: Boolean(accessToken && tenantId),
  });
}

export function usePlatformTenants() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: tenantQueryKey,
    queryFn: ({ signal }) => getPlatformTenants(accessToken!, signal),
    enabled: Boolean(accessToken),
  });
}

export function useSetPlatformTenantStatus() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);

  return useMutation({
    mutationFn: ({
      tenantId,
      status,
    }: {
      tenantId: string;
      status: PlatformTenantStatus;
    }) => setPlatformTenantStatus(tenantId, status, accessToken!),
    onSuccess: (result, { tenantId }) => {
      queryClient.setQueryData<PlatformTenant[]>(tenantQueryKey, (tenants) =>
        tenants?.map((tenant) =>
          tenant.id === tenantId ? { ...tenant, status: result.status } : tenant,
        ),
      );
      void queryClient.invalidateQueries({
        queryKey: ["platform-admin", "overview"],
      });
    },
  });
}
