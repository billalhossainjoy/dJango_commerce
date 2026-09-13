"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  type AdminCustomer,
  CustomerService,
} from "@/app/admin/customers/customer.service";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAuthStore } from "@/stores/auth-store";

const customerService = new CustomerService();

function customerQueryKey(tenantSlug: string | undefined) {
  return ["admin", tenantSlug, "customers"] as const;
}

export function useCustomers() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useCurrentUser();
  const tenantSlug = currentUser.data?.tenant?.slug;

  return useQuery({
    queryKey: customerQueryKey(tenantSlug),
    queryFn: ({ signal }) =>
      customerService.list(tenantSlug!, accessToken!, signal),
    enabled: Boolean(tenantSlug && accessToken),
  });
}

type SetCustomerActiveInput = {
  customerId: string;
  isActive: boolean;
};

export function useSetCustomerActive() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useCurrentUser();
  const tenantSlug = currentUser.data?.tenant?.slug;

  return useMutation({
    mutationFn: ({ customerId, isActive }: SetCustomerActiveInput) =>
      customerService.setActive(
        tenantSlug!,
        customerId,
        isActive,
        accessToken!,
      ),
    onSuccess: (updatedCustomer) => {
      queryClient.setQueryData<AdminCustomer[]>(
        customerQueryKey(tenantSlug),
        (customers) =>
          customers?.map((customer) =>
            customer.id === updatedCustomer.id ? updatedCustomer : customer,
          ),
      );
    },
  });
}
