"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type {
  Product,
  ProductInput,
} from "@/app/admin/products/product.service";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { FormInput } from "@/components/ui/form-input";
import { getApiErrorMessage } from "@/lib/api-client";

const productSchema = z.object({
  name: z.string().trim().min(1, "Product name is required."),
  slug: z
    .string()
    .trim()
    .min(1, "Product slug is required.")
    .max(160, "Product slug must contain at most 160 characters.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and single hyphens.",
    ),
  description: z.string(),
  price: z.number().min(0, "Price cannot be negative."),
  stockQuantity: z
    .number()
    .int("Stock must be a whole number.")
    .min(0, "Stock cannot be negative."),
  isActive: z.boolean(),
});

type ProductFormValues = z.infer<typeof productSchema>;

type ProductFormProps = {
  product?: Product;
  isDeletingImage?: boolean;
  isMakingImagePrimary?: boolean;
  isUpdatingImageAltText?: boolean;
  submitLabel: string;
  pendingLabel: string;
  isPending: boolean;
  cancelHref?: string;
  onDeleteImage?: (imageId: string) => Promise<unknown>;
  onMakeImagePrimary?: (imageId: string) => Promise<unknown>;
  onUpdateImageAltText?: (
    imageId: string,
    altText: string,
  ) => Promise<unknown>;
  onSubmit: (input: ProductInput, images: File[]) => Promise<unknown>;
};

type SelectedImage = {
  file: File;
  previewUrl: string;
};

const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageSize = 5 * 1024 * 1024;
const maxImageCount = 8;

export function ProductForm({
  product,
  isDeletingImage = false,
  isMakingImagePrimary = false,
  isUpdatingImageAltText = false,
  submitLabel,
  pendingLabel,
  isPending,
  cancelHref = "/admin/products",
  onDeleteImage,
  onMakeImagePrimary,
  onUpdateImageAltText,
  onSubmit,
}: ProductFormProps) {
  const isBusy =
    isPending ||
    isDeletingImage ||
    isMakingImagePrimary ||
    isUpdatingImageAltText;
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [altTextDrafts, setAltTextDrafts] = useState<Record<string, string>>({});
  const selectedImagesRef = useRef<SelectedImage[]>([]);
  const [imageError, setImageError] = useState<string>();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? "",
      slug: product?.slug ?? "",
      description: product?.description ?? "",
      price: product ? product.price_cents / 100 : 0,
      stockQuantity: product?.stock_quantity ?? 0,
      isActive: product?.is_active ?? true,
    },
  });

  useEffect(() => {
    selectedImagesRef.current = selectedImages;
  }, [selectedImages]);

  useEffect(
    () => () => {
      selectedImagesRef.current.forEach(({ previewUrl }) =>
        URL.revokeObjectURL(previewUrl),
      );
    },
    [],
  );

  function selectImages(files: FileList | null) {
    if (!files) return;

    const incoming = Array.from(files);
    const invalidType = incoming.some((file) => !acceptedImageTypes.has(file.type));
    const oversized = incoming.some((file) => file.size > maxImageSize);

    if (invalidType) {
      setImageError("Use JPEG, PNG, or WebP images only.");
      return;
    }
    if (oversized) {
      setImageError("Each image must be 5 MB or smaller.");
      return;
    }
    const existingImageCount = product?.images.length ?? 0;
    if (
      existingImageCount + selectedImages.length + incoming.length >
      maxImageCount
    ) {
      setImageError(`Add no more than ${maxImageCount} product images.`);
      return;
    }

    setImageError(undefined);
    setSelectedImages((current) => [
      ...current,
      ...incoming.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
  }

  function removeImage(previewUrl: string) {
    URL.revokeObjectURL(previewUrl);
    setSelectedImages((current) =>
      current.filter((image) => image.previewUrl !== previewUrl),
    );
  }

  async function deleteExistingImage(imageId: string) {
    if (!onDeleteImage) return;
    if (!window.confirm("Delete this product image permanently?")) return;

    setImageError(undefined);
    try {
      await onDeleteImage(imageId);
    } catch (error) {
      setImageError(
        getApiErrorMessage(error, "Unable to delete this product image."),
      );
    }
  }

  async function makeExistingImagePrimary(imageId: string) {
    if (!onMakeImagePrimary) return;

    setImageError(undefined);
    try {
      await onMakeImagePrimary(imageId);
    } catch (error) {
      setImageError(
        getApiErrorMessage(error, "Unable to make this the primary image."),
      );
    }
  }

  async function updateExistingImageAltText(imageId: string, altText: string) {
    if (!onUpdateImageAltText) return;

    setImageError(undefined);
    const normalizedAltText = altText.trim();
    try {
      await onUpdateImageAltText(imageId, normalizedAltText);
      setAltTextDrafts((current) => ({
        ...current,
        [imageId]: normalizedAltText,
      }));
    } catch (error) {
      setImageError(
        getApiErrorMessage(error, "Unable to update the image alt text."),
      );
    }
  }

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(
        {
          name: values.name,
          slug: values.slug,
          description: values.description,
          price_cents: Math.round(values.price * 100),
          stock_quantity: values.stockQuantity,
          is_active: values.isActive,
        },
        selectedImages.map(({ file }) => file),
      );
    } catch (error) {
      setError("root", {
        message: getApiErrorMessage(
          error,
          "Unable to save this product. Please check the values.",
        ),
      });
    }
  });

  return (
    <form
      className="mt-8 max-w-3xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/60"
      onSubmit={submit}
    >
      <div className="space-y-6 p-6 sm:p-8">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Product information</h2>
          <p className="mt-1 text-sm text-slate-500">
            Add the details customers will see on your storefront.
          </p>
        </div>
        <FormInput
          id="product-name"
          label="Name"
          className="h-10 bg-white px-3 text-sm"
          placeholder="Canvas backpack"
          error={errors.name}
          {...register("name")}
        />
        <FormInput
          id="product-slug"
          label="Slug"
          className="h-10 bg-white px-3 text-sm"
          placeholder="canvas-backpack"
          error={errors.slug}
          {...register("slug")}
        />
        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor="product-description">Description</FieldLabel>
          <textarea
            id="product-description"
            aria-invalid={!!errors.description}
            placeholder="Describe the product and its key features."
            className="min-h-32 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            {...register("description")}
          />
          <FieldError errors={[errors.description]} />
        </Field>
      </div>

      <div className="space-y-6 border-t border-slate-100 p-6 sm:p-8">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Pricing and inventory</h2>
          <p className="mt-1 text-sm text-slate-500">
            Set the USD price and currently available stock.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            id="product-price"
            label="Price (USD)"
            className="h-10 bg-white px-3 text-sm"
            type="number"
            min="0"
            step="0.01"
            error={errors.price}
            {...register("price", { valueAsNumber: true })}
          />
          <FormInput
            id="product-stock"
            label="Stock"
            className="h-10 bg-white px-3 text-sm"
            type="number"
            min="0"
            step="1"
            error={errors.stockQuantity}
            {...register("stockQuantity", { valueAsNumber: true })}
          />
        </div>
        <label className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-sm text-slate-600">
          <input
            className="size-4 accent-indigo-600"
            type="checkbox"
            {...register("isActive")}
          />
          <span>
            <span className="block font-semibold text-slate-900">
              Visible on storefront
            </span>
            Customers can find and purchase this product.
          </span>
        </label>
      </div>

      <div className="space-y-5 border-t border-slate-100 p-6 sm:p-8">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Product images
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Add up to {maxImageCount} JPEG, PNG, or WebP images. Each image
              must be 5 MB or smaller.
            </p>
          </div>

          {product?.images.length ? (
            <div>
              <p className="mb-3 text-sm font-medium text-slate-700">
                Current images
              </p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {product.images.map((image) => (
                  <div
                    key={image.id}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                  >
                    <div className="relative aspect-square bg-slate-100">
                      {image.url ? (
                        <Image
                          src={image.url}
                          alt={image.alt_text || product.name}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      ) : null}
                      {onDeleteImage ? (
                        <button
                          type="button"
                          className="absolute right-2 top-2 rounded-md bg-white/95 px-2 py-1 text-xs font-semibold text-red-600 shadow-sm hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={isBusy}
                          onClick={() => void deleteExistingImage(image.id)}
                        >
                          {isDeletingImage ? "Deleting…" : "Delete"}
                        </button>
                      ) : null}
                      {image.sort_order === 0 ? (
                        <span className="absolute bottom-2 left-2 rounded-md bg-indigo-600 px-2 py-1 text-xs font-semibold text-white shadow-sm">
                          Primary
                        </span>
                      ) : onMakeImagePrimary ? (
                        <button
                          type="button"
                          className="absolute bottom-2 left-2 rounded-md bg-white/95 px-2 py-1 text-xs font-semibold text-indigo-700 shadow-sm hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={isBusy}
                          onClick={() => void makeExistingImagePrimary(image.id)}
                        >
                          {isMakingImagePrimary ? "Updating…" : "Make primary"}
                        </button>
                      ) : null}
                    </div>
                    {onUpdateImageAltText ? (
                      <div className="space-y-2 p-2">
                        <label
                          className="block text-xs font-medium text-slate-600"
                          htmlFor={`image-alt-text-${image.id}`}
                        >
                          Alt text
                        </label>
                        <input
                          id={`image-alt-text-${image.id}`}
                          type="text"
                          maxLength={255}
                          value={altTextDrafts[image.id] ?? image.alt_text}
                          disabled={isBusy}
                          className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
                          onChange={(event) =>
                            setAltTextDrafts((current) => ({
                              ...current,
                              [image.id]: event.target.value,
                            }))
                          }
                        />
                        <button
                          type="button"
                          disabled={
                            isBusy ||
                            (altTextDrafts[image.id] ?? image.alt_text) ===
                              image.alt_text
                          }
                          className="text-xs font-semibold text-indigo-700 hover:text-indigo-800 disabled:cursor-not-allowed disabled:text-slate-400"
                          onClick={() =>
                            void updateExistingImageAltText(
                              image.id,
                              altTextDrafts[image.id] ?? image.alt_text,
                            )
                          }
                        >
                          {isUpdatingImageAltText ? "Saving…" : "Save alt text"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <label
            htmlFor="product-images"
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-indigo-300 bg-indigo-50/40 px-6 py-8 text-center transition hover:border-indigo-400 hover:bg-indigo-50"
          >
            <span className="text-sm font-semibold text-indigo-700">
              Choose product images
            </span>
            <span className="mt-1 text-xs text-slate-500">
              You can select multiple files
            </span>
          </label>
          <input
            id="product-images"
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={isBusy}
            onChange={(event) => {
              selectImages(event.target.files);
              event.target.value = "";
            }}
          />

          {imageError ? (
            <p className="text-sm font-medium text-red-600">{imageError}</p>
          ) : null}

          {selectedImages.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {selectedImages.map(({ file, previewUrl }) => (
                <div
                  key={previewUrl}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  <div className="relative aspect-square bg-slate-100">
                    <Image
                      src={previewUrl}
                      alt={file.name}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <div className="flex items-center gap-2 p-2">
                    <span className="min-w-0 flex-1 truncate text-xs text-slate-600">
                      {file.name}
                    </span>
                    <button
                      type="button"
                      className="text-xs font-semibold text-red-600 hover:text-red-700"
                      disabled={isBusy}
                      onClick={() => removeImage(previewUrl)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/80 px-6 py-4 sm:px-8">
        <FieldError>{errors.root?.message}</FieldError>
        <div className="ml-auto flex items-center gap-3">
          <Button asChild variant="outline" size="lg" className="h-10 px-4">
            <Link href={cancelHref}>Cancel</Link>
          </Button>
          <Button type="submit" size="lg" className="h-10 bg-indigo-600 px-4 text-white hover:bg-indigo-700" disabled={isBusy}>
            {isPending ? pendingLabel : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
