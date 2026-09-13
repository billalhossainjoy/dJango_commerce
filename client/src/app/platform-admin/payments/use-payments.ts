"use client";

import { useQuery } from "@tanstack/react-query";

import { getPlatformPayments } from "@/app/platform-admin/payments/payment.service";
import { useAuthStore } from "@/stores/auth-store";

export function usePlatformPayments() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ["platform-admin", "payments"],
    queryFn: ({ signal }) => getPlatformPayments(accessToken!, signal),
    enabled: Boolean(accessToken),
  });
}
