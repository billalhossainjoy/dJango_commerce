"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { CustomerAuthService } from "@/services/customer-auth.service";
import {
  customerSessionQueryKey,
  useCustomerAuthStore,
} from "@/stores/customer-auth-store";

const service = new CustomerAuthService();

export function CustomerAuthSession({ tenantSlug }: { tenantSlug: string }) {
  const setAuthenticated = useCustomerAuthStore(
    (state) => state.setAuthenticated,
  );
  const setUnauthenticated = useCustomerAuthStore(
    (state) => state.setUnauthenticated,
  );
  const session = useQuery({
    queryKey: customerSessionQueryKey(tenantSlug),
    queryFn: () => service.refresh(tenantSlug),
    retry: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (session.data?.access) {
      setAuthenticated(tenantSlug, session.data.access);
    } else if (session.isError) {
      setUnauthenticated(tenantSlug);
    }
  }, [session.data, session.isError, setAuthenticated, setUnauthenticated, tenantSlug]);

  return null;
}
