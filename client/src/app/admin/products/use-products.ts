"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  type ProductInput,
  ProductService,
} from "@/app/admin/products/product.service";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAuthStore } from "@/stores/auth-store";

const productService = new ProductService();

function productQueryKey(tenantSlug: string | undefined) {
  return ["admin", tenantSlug, "products"] as const;
}

function productDetailQueryKey(
  tenantSlug: string | undefined,
  productId: string,
) {
  return [...productQueryKey(tenantSlug), productId] as const;
}

export function useProducts() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useCurrentUser();
  const tenantSlug = currentUser.data?.tenant?.slug;

  return useQuery({
    queryKey: productQueryKey(tenantSlug),
    queryFn: ({ signal }) =>
      productService.list(tenantSlug!, accessToken!, signal),
    enabled: Boolean(tenantSlug && accessToken),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useCurrentUser();
  const tenantSlug = currentUser.data?.tenant?.slug;

  return useMutation({
    mutationFn: (input: ProductInput) =>
      productService.create(tenantSlug!, input, accessToken!),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: productQueryKey(tenantSlug),
      });
    },
  });
}

export function useProduct(productId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useCurrentUser();
  const tenantSlug = currentUser.data?.tenant?.slug;

  return useQuery({
    queryKey: productDetailQueryKey(tenantSlug, productId),
    queryFn: ({ signal }) =>
      productService.retrieve(tenantSlug!, productId, accessToken!, signal),
    enabled: Boolean(tenantSlug && accessToken),
  });
}

export function useUpdateProduct(productId: string) {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useCurrentUser();
  const tenantSlug = currentUser.data?.tenant?.slug;

  return useMutation({
    mutationFn: (input: ProductInput) =>
      productService.update(tenantSlug!, productId, input, accessToken!),
    onSuccess: (product) => {
      queryClient.setQueryData(
        productDetailQueryKey(tenantSlug, productId),
        product,
      );
      void queryClient.invalidateQueries({
        queryKey: productQueryKey(tenantSlug),
      });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useCurrentUser();
  const tenantSlug = currentUser.data?.tenant?.slug;

  return useMutation({
    mutationFn: (productId: string) =>
      productService.remove(tenantSlug!, productId, accessToken!),
    onSuccess: (_, productId) => {
      queryClient.removeQueries({
        queryKey: productDetailQueryKey(tenantSlug, productId),
      });
      void queryClient.invalidateQueries({
        queryKey: productQueryKey(tenantSlug),
      });
    },
  });
}
