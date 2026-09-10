"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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

export function useUpdateCustomerProfile(tenantSlug: string) {
  const queryClient = useQueryClient();
  const accessToken = useCustomerAuthStore((state) => state.accessToken);

  return useMutation({
    mutationFn: (profile: { name: string; email: string }) =>
      service.updateProfile(tenantSlug, accessToken!, profile),
    onSuccess: (customer) => {
      queryClient.setQueryData(customerQueryKey(tenantSlug), customer);
    },
  });
}

export function useChangeCustomerPassword(tenantSlug: string) {
  const accessToken = useCustomerAuthStore((state) => state.accessToken);

  return useMutation({
    mutationFn: (passwords: {
      current_password: string;
      new_password: string;
    }) => service.changePassword(tenantSlug, accessToken!, passwords),
  });
}
