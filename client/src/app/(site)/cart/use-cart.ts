"use client";

import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  addCartItem,
  claimCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from "@/app/(site)/cart/cart.service";
import { useCustomerAuthStore } from "@/stores/customer-auth-store";

export function cartQueryKey(
  tenantSlug: string,
  isAuthenticated: boolean,
) {
  return [
    "storefront",
    tenantSlug,
    "cart",
    isAuthenticated ? "customer" : "guest",
  ] as const;
}

export function claimGuestCart(
  queryClient: QueryClient,
  tenantSlug: string,
  accessToken: string,
) {
  void claimCart(tenantSlug, accessToken)
    .then((cart) =>
      queryClient.setQueryData(cartQueryKey(tenantSlug, true), cart),
    )
    .catch(() =>
      queryClient.invalidateQueries({
        queryKey: cartQueryKey(tenantSlug, true),
      }),
    );
}

function useCartAuth(tenantSlug: string) {
  const accessToken = useCustomerAuthStore((state) =>
    state.tenantSlug === tenantSlug ? state.accessToken : null,
  );
  const status = useCustomerAuthStore((state) =>
    state.tenantSlug === tenantSlug ? state.status : "loading",
  );

  return { accessToken, status };
}

export function useCart(tenantSlug: string) {
  const { accessToken, status } = useCartAuth(tenantSlug);

  return useQuery({
    queryKey: cartQueryKey(tenantSlug, accessToken !== null),
    queryFn: ({ signal }) => getCart(tenantSlug, accessToken, signal),
    enabled: status !== "loading",
  });
}

export function useAddCartItem(tenantSlug: string) {
  const queryClient = useQueryClient();
  const { accessToken } = useCartAuth(tenantSlug);

  return useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      addCartItem(tenantSlug, productId, quantity, accessToken),
    onSuccess: (cart) =>
      queryClient.setQueryData(
        cartQueryKey(tenantSlug, accessToken !== null),
        cart,
      ),
  });
}

export function useUpdateCartItem(tenantSlug: string) {
  const queryClient = useQueryClient();
  const { accessToken } = useCartAuth(tenantSlug);

  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      updateCartItem(tenantSlug, itemId, quantity, accessToken),
    onSuccess: (cart) =>
      queryClient.setQueryData(
        cartQueryKey(tenantSlug, accessToken !== null),
        cart,
      ),
  });
}

export function useRemoveCartItem(tenantSlug: string) {
  const queryClient = useQueryClient();
  const { accessToken } = useCartAuth(tenantSlug);

  return useMutation({
    mutationFn: (itemId: string) => removeCartItem(tenantSlug, itemId, accessToken),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: cartQueryKey(tenantSlug, accessToken !== null),
      }),
  });
}
