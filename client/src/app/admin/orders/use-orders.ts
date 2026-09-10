"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  type AdminOrder,
  type FulfillmentStatus,
  cancelAdminOrder,
  getAdminOrder,
  listAdminOrders,
  updateOrderFulfillment,
} from "@/app/admin/orders/order.service";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAuthStore } from "@/stores/auth-store";

function ordersQueryKey(tenantSlug: string | undefined) {
  return ["admin", tenantSlug, "orders"] as const;
}

function updateOrderCache(
  queryClient: ReturnType<typeof useQueryClient>,
  tenantSlug: string | undefined,
  updatedOrder: AdminOrder,
) {
  queryClient.setQueryData<AdminOrder[]>(ordersQueryKey(tenantSlug), (orders) =>
    orders?.map((order) =>
      order.id === updatedOrder.id ? updatedOrder : order,
    ),
  );
  queryClient.setQueryData(
    [...ordersQueryKey(tenantSlug), updatedOrder.id],
    updatedOrder,
  );
}

export function useAdminOrders() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useCurrentUser();
  const tenantSlug = currentUser.data?.tenant?.slug;

  return useQuery({
    queryKey: ordersQueryKey(tenantSlug),
    queryFn: ({ signal }) =>
      listAdminOrders(tenantSlug!, accessToken!, signal),
    enabled: Boolean(tenantSlug && accessToken),
  });
}

export function useAdminOrder(orderId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useCurrentUser();
  const tenantSlug = currentUser.data?.tenant?.slug;

  return useQuery({
    queryKey: [...ordersQueryKey(tenantSlug), orderId],
    queryFn: ({ signal }) =>
      getAdminOrder(tenantSlug!, orderId, accessToken!, signal),
    enabled: Boolean(tenantSlug && accessToken),
  });
}

export function useUpdateOrderFulfillment() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useCurrentUser();
  const tenantSlug = currentUser.data?.tenant?.slug;

  return useMutation({
    mutationFn: ({
      orderId,
      fulfillmentStatus,
    }: {
      orderId: string;
      fulfillmentStatus: FulfillmentStatus;
    }) =>
      updateOrderFulfillment(
        tenantSlug!,
        orderId,
        fulfillmentStatus,
        accessToken!,
      ),
    onSuccess: (updatedOrder) => {
      updateOrderCache(queryClient, tenantSlug, updatedOrder);
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useCurrentUser();
  const tenantSlug = currentUser.data?.tenant?.slug;

  return useMutation({
    mutationFn: (orderId: string) =>
      cancelAdminOrder(tenantSlug!, orderId, accessToken!),
    onSuccess: (updatedOrder) => {
      updateOrderCache(queryClient, tenantSlug, updatedOrder);
    },
  });
}
