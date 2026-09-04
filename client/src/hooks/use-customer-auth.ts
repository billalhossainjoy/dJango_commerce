"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { CustomerAuthService } from "@/services/customer-auth.service";
import {
  customerSessionQueryKey,
  useCustomerAuthStore,
} from "@/stores/customer-auth-store";

const service = new CustomerAuthService();

export function useCustomerAuth(tenantSlug: string) {
  const queryClient = useQueryClient();
  const store = useCustomerAuthStore();
  const belongsToTenant = store.tenantSlug === tenantSlug;

  const login = useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      service.login(tenantSlug, input.email, input.password),
    onSuccess: ({ access }) => {
      queryClient.setQueryData(customerSessionQueryKey(tenantSlug), { access });
      store.setAuthenticated(tenantSlug, access);
    },
  });
  const signup = useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      service.signup(tenantSlug, input.email, input.password),
  });
  const logout = useMutation({
    mutationFn: () => service.logout(tenantSlug),
    onSettled: () => {
      queryClient.setQueryData(customerSessionQueryKey(tenantSlug), null);
      store.setUnauthenticated(tenantSlug);
    },
  });

  return {
    accessToken: belongsToTenant ? store.accessToken : null,
    status: belongsToTenant ? store.status : "loading",
    login: login.mutateAsync,
    signup: signup.mutateAsync,
    logout: () => logout.mutateAsync().catch(() => undefined),
  };
}
