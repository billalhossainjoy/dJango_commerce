"use client";

import { useRouter } from "next/navigation";

import { ProductForm } from "@/app/admin/products/product-form";
import { useCreateProduct } from "@/app/admin/products/use-products";
import { useCurrentUser } from "@/hooks/use-current-user";

export default function CreateProductPage() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const createProduct = useCreateProduct();

  if (currentUser.isPending) {
    return <p className="text-sm text-zinc-600">Loading your store…</p>;
  }

  if (currentUser.isError || !currentUser.data?.tenant) {
    return <p className="text-sm text-red-600">Unable to load your store.</p>;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Catalog</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        Add product
      </h1>
      <p className="mt-2 text-sm text-zinc-600">
        Create a product for your tenant storefront.
      </p>
      <ProductForm
        submitLabel="Create product"
        pendingLabel="Creating…"
        isPending={createProduct.isPending}
        onSubmit={async (input) => {
          await createProduct.mutateAsync(input);
          router.replace("/admin/products");
        }}
      />
    </div>
  );
}
