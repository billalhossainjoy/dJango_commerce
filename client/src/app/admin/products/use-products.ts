"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";

import {
  type ProductInput,
  ProductService,
} from "@/app/admin/products/product.service";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAuthStore } from "@/stores/auth-store";

const productService = new ProductService();

type CreateProductInput = {
  input: ProductInput;
  images: File[];
};

type ImageAltTextInput = {
  imageId: string;
  altText: string;
};

export class ProductImageUploadError extends Error {
  constructor(
    public readonly productId: string,
    cause: unknown,
  ) {
    super("The product was saved as hidden, but its images could not be uploaded.");
    this.name = "ProductImageUploadError";
    this.cause = cause;
  }
}

function productQueryKey(tenantSlug: string | undefined) {
  return ["admin", tenantSlug, "products"] as const;
}

function productDetailQueryKey(
  tenantSlug: string | undefined,
  productId: string,
) {
  return [...productQueryKey(tenantSlug), productId] as const;
}

function invalidateProductQueries(
  queryClient: QueryClient,
  tenantSlug: string | undefined,
) {
  void queryClient.invalidateQueries({
    queryKey: productQueryKey(tenantSlug),
  });
}

function useProductAccess() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useCurrentUser();

  return {
    accessToken,
    tenantSlug: currentUser.data?.tenant?.slug,
  };
}

function useProductImageMutation<TData, TVariables>(
  mutation: (
    tenantSlug: string,
    accessToken: string,
    variables: TVariables,
  ) => Promise<TData>,
) {
  const queryClient = useQueryClient();
  const { accessToken, tenantSlug } = useProductAccess();

  return useMutation({
    mutationFn: (variables: TVariables) =>
      mutation(tenantSlug!, accessToken!, variables),
    onSuccess: () => invalidateProductQueries(queryClient, tenantSlug),
  });
}

export function useProducts() {
  const { accessToken, tenantSlug } = useProductAccess();

  return useQuery({
    queryKey: productQueryKey(tenantSlug),
    queryFn: ({ signal }) =>
      productService.list(tenantSlug!, accessToken!, signal),
    enabled: Boolean(tenantSlug && accessToken),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { accessToken, tenantSlug } = useProductAccess();

  return useMutation({
    mutationFn: async ({ input, images }: CreateProductInput) => {
      const product = await productService.create(
        tenantSlug!,
        images.length > 0 ? { ...input, is_active: false } : input,
        accessToken!,
      );

      if (images.length === 0) return product;

      try {
        for (const image of images) {
          await productService.uploadImage(
            tenantSlug!,
            product.id,
            image,
            accessToken!,
          );
        }

        if (input.is_active) {
          return await productService.update(
            tenantSlug!,
            product.id,
            input,
            accessToken!,
          );
        }
        return await productService.retrieve(
          tenantSlug!,
          product.id,
          accessToken!,
        );
      } catch (error) {
        throw new ProductImageUploadError(product.id, error);
      }
    },
    onSettled: () => invalidateProductQueries(queryClient, tenantSlug),
  });
}

export function useProduct(productId: string) {
  const { accessToken, tenantSlug } = useProductAccess();

  return useQuery({
    queryKey: productDetailQueryKey(tenantSlug, productId),
    queryFn: ({ signal }) =>
      productService.retrieve(tenantSlug!, productId, accessToken!, signal),
    enabled: Boolean(tenantSlug && accessToken),
  });
}

export function useUpdateProduct(productId: string) {
  const queryClient = useQueryClient();
  const { accessToken, tenantSlug } = useProductAccess();

  return useMutation({
    mutationFn: (input: ProductInput) =>
      productService.update(tenantSlug!, productId, input, accessToken!),
    onSuccess: (product) => {
      queryClient.setQueryData(
        productDetailQueryKey(tenantSlug, productId),
        product,
      );
      invalidateProductQueries(queryClient, tenantSlug);
    },
  });
}

export function useUploadProductImages(productId: string) {
  const queryClient = useQueryClient();
  const { accessToken, tenantSlug } = useProductAccess();

  return useMutation({
    mutationFn: async (images: File[]) => {
      for (const image of images) {
        await productService.uploadImage(
          tenantSlug!,
          productId,
          image,
          accessToken!,
        );
      }
    },
    onSettled: () => invalidateProductQueries(queryClient, tenantSlug),
  });
}

export function useDeleteProductImage(productId: string) {
  return useProductImageMutation(
    (tenantSlug, accessToken, imageId: string) =>
      productService.removeImage(tenantSlug, productId, imageId, accessToken),
  );
}

export function useMakeProductImagePrimary(productId: string) {
  return useProductImageMutation(
    (tenantSlug, accessToken, imageId: string) =>
      productService.makeImagePrimary(
        tenantSlug,
        productId,
        imageId,
        accessToken,
      ),
  );
}

export function useUpdateProductImageAltText(productId: string) {
  return useProductImageMutation(
    (tenantSlug, accessToken, { imageId, altText }: ImageAltTextInput) =>
      productService.updateImageAltText(
        tenantSlug,
        productId,
        imageId,
        altText,
        accessToken,
      ),
  );
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const { accessToken, tenantSlug } = useProductAccess();

  return useMutation({
    mutationFn: (productId: string) =>
      productService.remove(tenantSlug!, productId, accessToken!),
    onSuccess: (_, productId) => {
      queryClient.removeQueries({
        queryKey: productDetailQueryKey(tenantSlug, productId),
      });
      invalidateProductQueries(queryClient, tenantSlug);
    },
  });
}
