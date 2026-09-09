"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getTenantSettings,
  type TenantSettings,
  updateTenantSettings,
} from "@/app/admin/settings/tenant-settings.service";
import {
  currentUserQueryKey,
  useCurrentUser,
} from "@/hooks/use-current-user";
import { useAuthStore } from "@/stores/auth-store";

function tenantSettingsQueryKey(tenantSlug: string | undefined) {
  return ["admin", tenantSlug, "settings"] as const;
}

function useTenantAccess() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useCurrentUser();
  return { accessToken, tenantSlug: currentUser.data?.tenant?.slug };
}

export function useTenantSettings() {
  const { accessToken, tenantSlug } = useTenantAccess();

  return useQuery({
    queryKey: tenantSettingsQueryKey(tenantSlug),
    queryFn: ({ signal }) =>
      getTenantSettings(tenantSlug!, accessToken!, signal),
    enabled: Boolean(tenantSlug && accessToken),
  });
}

export function useUpdateTenantSettings() {
  const queryClient = useQueryClient();
  const { accessToken, tenantSlug } = useTenantAccess();

  return useMutation({
    mutationFn: (settings: Pick<TenantSettings, "name" | "slug">) =>
      updateTenantSettings(tenantSlug!, accessToken!, settings),
    onSuccess: (settings) => {
      queryClient.setQueryData(tenantSettingsQueryKey(tenantSlug), settings);
      return queryClient.invalidateQueries({ queryKey: currentUserQueryKey });
    },
  });
}
