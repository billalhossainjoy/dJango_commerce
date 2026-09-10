"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import {
  createBillingPortal,
  createSubscriptionCheckout,
  getSubscription,
} from "@/app/admin/billing/billing.service";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAuthStore } from "@/stores/auth-store";

function useBillingAccess() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useCurrentUser();
  return { accessToken, tenantSlug: currentUser.data?.tenant?.slug };
}

export function useSubscription(waitForCheckout = false) {
  const { accessToken, tenantSlug } = useBillingAccess();

  return useQuery({
    queryKey: ["admin", tenantSlug, "billing"],
    queryFn: ({ signal }) =>
      getSubscription(tenantSlug!, accessToken!, signal),
    enabled: Boolean(tenantSlug && accessToken),
    refetchInterval: (query) => {
      if (!waitForCheckout) return false;
      const status = query.state.data?.status;
      return status === "trialing" || status === "active" ? false : 2_000;
    },
  });
}

export function useStartSubscriptionCheckout() {
  const { accessToken, tenantSlug } = useBillingAccess();

  return useMutation({
    mutationFn: () => createSubscriptionCheckout(tenantSlug!, accessToken!),
    onSuccess: ({ checkout_url: checkoutUrl }) => {
      window.location.assign(checkoutUrl);
    },
  });
}

export function useOpenBillingPortal() {
  const { accessToken, tenantSlug } = useBillingAccess();

  return useMutation({
    mutationFn: () => createBillingPortal(tenantSlug!, accessToken!),
    onSuccess: ({ portal_url: portalUrl }) => {
      window.location.assign(portalUrl);
    },
  });
}
