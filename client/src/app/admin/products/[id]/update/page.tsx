"use client";

import { useRouter } from "next/navigation";
import { use } from "react";

import { ProductForm } from "@/app/admin/products/product-form";
import {
  useDeleteProductImage,
  useMakeProductImagePrimary,
  useProduct,
  useUploadProductImages,
  useUpdateProduct,
  useUpdateProductImageAltText,
} from "@/app/admin/products/use-products";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getApiErrorMessage } from "@/lib/api-client";

export default function UpdateProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const currentUser = useCurrentUser();
  const product = useProduct(id);
  const updateProduct = useUpdateProduct(id);
  const uploadImages = useUploadProductImages(id);
  const deleteImage = useDeleteProductImage(id);
  const makeImagePrimary = useMakeProductImagePrimary(id);
  const updateImageAltText = useUpdateProductImageAltText(id);

  if (currentUser.isPending || product.isPending) {
    return <p className="text-sm text-zinc-600">Loading product…</p>;
  }

  if (
    currentUser.isError ||
    !currentUser.data?.tenant ||
    product.isError
  ) {
    return <p className="text-sm text-red-600">Unable to load this product.</p>;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Catalog</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        Update product
      </h1>
      <p className="mt-2 text-sm text-zinc-600">
        Change product details, inventory, or storefront visibility.
      </p>
      <ProductForm
        product={product.data}
        isDeletingImage={deleteImage.isPending}
        isMakingImagePrimary={makeImagePrimary.isPending}
        isUpdatingImageAltText={updateImageAltText.isPending}
        submitLabel="Save changes"
        pendingLabel="Saving…"
        isPending={updateProduct.isPending || uploadImages.isPending}
        onDeleteImage={(imageId) => deleteImage.mutateAsync(imageId)}
        onMakeImagePrimary={(imageId) =>
          makeImagePrimary.mutateAsync(imageId)
        }
        onUpdateImageAltText={(imageId, altText) =>
          updateImageAltText.mutateAsync({ imageId, altText })
        }
        onSubmit={async (input, images) => {
          await updateProduct.mutateAsync(input);
          if (images.length > 0) {
            try {
              await uploadImages.mutateAsync(images);
            } catch (error) {
              throw new Error(
                getApiErrorMessage(
                  error,
                  "Product changes were saved, but one or more images failed to upload. Reselect those images and try again.",
                ),
              );
            }
          }
          router.replace("/admin/products");
        }}
      />
    </div>
  );
}
