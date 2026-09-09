"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { cartQueryKey } from "@/app/(site)/cart/use-cart";
import {
  createOrder,
  type CreateOrderInput,
  getOrder,
} from "@/app/(site)/checkout/checkout.service";
import { useCustomerAuthStore } from "@/stores/customer-auth-store";

export function useCreateOrder(tenantSlug: string) {
  const queryClient = useQueryClient();
  const accessToken = useCustomerAuthStore((state) =>
    state.tenantSlug === tenantSlug ? state.accessToken : null,
  );

  return useMutation({
    mutationFn: ({
      input,
      idempotencyKey,
    }: {
      input: CreateOrderInput;
      idempotencyKey: string;
    }) => createOrder(tenantSlug, input, idempotencyKey, accessToken),
    onSuccess: () => {
      queryClient.setQueryData(cartQueryKey(tenantSlug, accessToken !== null), {
        id: null,
        items: [],
        item_count: 0,
        subtotal_cents: 0,
      });
    },
  });
}

export function useOrder(tenantSlug: string, orderId: string) {
  const accessToken = useCustomerAuthStore((state) =>
    state.tenantSlug === tenantSlug ? state.accessToken : null,
  );
  const authStatus = useCustomerAuthStore((state) =>
    state.tenantSlug === tenantSlug ? state.status : "loading",
  );

  return useQuery({
    queryKey: ["storefront", tenantSlug, "orders", orderId],
    queryFn: ({ signal }) => getOrder(tenantSlug, orderId, accessToken, signal),
    enabled: authStatus !== "loading",
  });
}
