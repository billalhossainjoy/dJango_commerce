"use client";

import Link from "next/link";

import {
  useDeleteProduct,
  useProducts,
} from "@/app/admin/products/use-products";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";

export default function ProductsPage() {
  const currentUser = useCurrentUser();
  const products = useProducts();
  const deleteProduct = useDeleteProduct();

  const removeProduct = (productId: string, productName: string) => {
    if (window.confirm(`Delete “${productName}”? This cannot be undone.`)) {
      deleteProduct.mutate(productId);
    }
  };

  if (currentUser.isPending) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="h-9 w-40 animate-pulse rounded bg-zinc-200" />
        <div className="mt-8 space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-20 animate-pulse rounded-xl border border-zinc-200 bg-white"
            />
          ))}
        </div>
      </div>
    );
  }

  if (currentUser.isError) {
    return (
      <p className="text-sm text-red-600" role="alert">
        Unable to load your store. Refresh the page and try again.
      </p>
    );
  }

  if (!currentUser.data?.tenant) {
    return <p className="text-sm text-zinc-600">No store is assigned to you.</p>;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Catalog</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Products
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage product prices, stock, and storefront visibility.
          </p>
        </div>
        <Button asChild size="lg" className="h-10 bg-indigo-600 px-4 text-white shadow-sm hover:bg-indigo-700">
          <Link href="/admin/products/create">Add product</Link>
        </Button>
      </div>

      <section className="mt-8">
        {products.isPending ? (
          <div className="space-y-3" aria-label="Loading products">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-20 animate-pulse rounded-xl border border-zinc-200 bg-white"
              />
            ))}
          </div>
        ) : products.isError ? (
          <p className="text-sm text-red-600">Unable to load products.</p>
        ) : products.data.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-600">
            No products yet. Add your first product to get started.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/60">
            {products.data.map((product) => (
              <article
                key={product.id}
                className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 transition-colors last:border-b-0 hover:bg-slate-50/70 sm:flex-row sm:items-center"
              >
                <div>
                  <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-600">{product.name.charAt(0).toUpperCase()}</span><div><h2 className="font-semibold text-slate-900">{product.name}</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    ${(product.price_cents / 100).toFixed(2)} ·{" "}
                    {product.stock_quantity} in stock ·{" "}
                    {product.is_active ? "Active" : "Draft"}
                  </p></div></div>
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline">
                    <Link href={`/admin/products/${product.id}/update`}>
                      Edit
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={
                      deleteProduct.isPending &&
                      deleteProduct.variables === product.id
                    }
                    onClick={() => removeProduct(product.id, product.name)}
                  >
                    {deleteProduct.isPending &&
                    deleteProduct.variables === product.id
                      ? "Deleting…"
                      : "Delete"}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
        {deleteProduct.isError ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            Unable to delete this product. Please try again.
          </p>
        ) : null}
      </section>
    </div>
  );
}
