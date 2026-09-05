"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
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
  submitLabel: string;
  pendingLabel: string;
  isPending: boolean;
  cancelHref?: string;
  onSubmit: (input: ProductInput) => Promise<unknown>;
};

export function ProductForm({
  product,
  submitLabel,
  pendingLabel,
  isPending,
  cancelHref = "/admin/products",
  onSubmit,
}: ProductFormProps) {
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

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit({
        name: values.name,
        slug: values.slug,
        description: values.description,
        price_cents: Math.round(values.price * 100),
        stock_quantity: values.stockQuantity,
        is_active: values.isActive,
      });
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

      <div className="flex items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/80 px-6 py-4 sm:px-8">
        <FieldError>{errors.root?.message}</FieldError>
        <div className="ml-auto flex items-center gap-3">
          <Button asChild variant="outline" size="lg" className="h-10 px-4">
            <Link href={cancelHref}>Cancel</Link>
          </Button>
          <Button type="submit" size="lg" className="h-10 bg-indigo-600 px-4 text-white hover:bg-indigo-700" disabled={isPending}>
            {isPending ? pendingLabel : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
