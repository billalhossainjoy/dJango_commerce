"use client";

import { useQuery } from "@tanstack/react-query";

import { CustomerAuthService } from "@/services/customer-auth.service";
import { useCustomerAuthStore } from "@/stores/customer-auth-store";

const service = new CustomerAuthService();

export function customerQueryKey(tenantSlug: string) {
  return ["customer-auth", tenantSlug, "current-customer"] as const;
}

export function useCurrentCustomer(tenantSlug: string) {
  const accessToken = useCustomerAuthStore((state) =>
    state.tenantSlug === tenantSlug ? state.accessToken : null,
  );

  return useQuery({
    queryKey: customerQueryKey(tenantSlug),
    queryFn: ({ signal }) => service.current(tenantSlug, accessToken!, signal),
    enabled: accessToken !== null,
  });
}
