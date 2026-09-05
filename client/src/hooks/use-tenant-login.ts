"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { AuthTokens } from "@/app/app.service";
import { CustomerAuthService } from "@/services/customer-auth.service";
import { authSessionQueryKey, useAuthStore } from "@/stores/auth-store";
import {
  customerSessionQueryKey,
  useCustomerAuthStore,
} from "@/stores/customer-auth-store";

const service = new CustomerAuthService();

export function useTenantLogin(tenantSlug: string) {
  const queryClient = useQueryClient();
  const setOwnerAuthenticated = useAuthStore(
    (state) => state.setAuthenticated,
  );
  const setCustomerAuthenticated = useCustomerAuthStore(
    (state) => state.setAuthenticated,
  );

  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      service.login(tenantSlug, input.email, input.password),
    onSuccess: ({ access, account_type: accountType }) => {
      if (accountType === "platform") {
        queryClient.setQueryData<AuthTokens>(authSessionQueryKey, { access });
        setOwnerAuthenticated(access);
        return;
      }

      queryClient.setQueryData(customerSessionQueryKey(tenantSlug), { access });
      setCustomerAuthenticated(tenantSlug, access);
    },
  });
}
