"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";

import type { Product } from "@/app/admin/products/product.service";
import {
  useDeleteProduct,
  useProducts,
} from "@/app/admin/products/use-products";
import { Button } from "@/components/ui/button";
import {
  createDataTableColumnHelper,
  DataTable,
  type DataTableFilter,
} from "@/components/ui/data-table";
import { useCurrentUser } from "@/hooks/use-current-user";

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const productColumnHelper = createDataTableColumnHelper<Product>();
const productFilters: DataTableFilter[] = [
  {
    columnId: "status",
    label: "statuses",
    options: [
      { label: "Active", value: "active" },
      { label: "Draft", value: "draft" },
    ],
  },
];
const productSearch = {
  columnId: "name",
  placeholder: "Search products by name…",
};

function getProductRowId(product: Product) {
  return product.id;
}

export default function ProductsPage() {
  const currentUser = useCurrentUser();
  const products = useProducts();
  const deleteProduct = useDeleteProduct();
  const deleteProductById = deleteProduct.mutate;
  const pendingProductId = deleteProduct.isPending
    ? deleteProduct.variables
    : null;

  const removeProduct = useCallback(
    (product: Product) => {
      if (window.confirm(`Delete “${product.name}”? This cannot be undone.`)) {
        deleteProductById(product.id);
      }
    },
    [deleteProductById],
  );
  const columns = useMemo(
    () =>
      productColumnHelper.columns([
        productColumnHelper.accessor("name", {
          header: "Product",
          filterFn: "includesString",
          cell: ({ row }) => (
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-600">
                {row.original.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">
                  {row.original.name}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  /{row.original.slug}
                </p>
              </div>
            </div>
          ),
        }),
        productColumnHelper.accessor("price_cents", {
          header: "Price",
          cell: ({ row }) => (
            <span className="whitespace-nowrap font-medium text-slate-700">
              {priceFormatter.format(row.original.price_cents / 100)}
            </span>
          ),
        }),
        productColumnHelper.accessor("stock_quantity", {
          header: "Stock",
          cell: ({ row }) => (
            <span className="whitespace-nowrap text-slate-600">
              {row.original.stock_quantity}
            </span>
          ),
        }),
        productColumnHelper.accessor(
          (product) => (product.is_active ? "active" : "draft"),
          {
            id: "status",
            header: "Status",
            filterFn: "equalsString",
            cell: ({ row }) => (
              <span
                className={
                  row.original.is_active
                    ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                    : "inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"
                }
              >
                {row.original.is_active ? "Active" : "Draft"}
              </span>
            ),
          },
        ),
        productColumnHelper.display({
          id: "actions",
          header: "Actions",
          cell: ({ row }) => (
            <div className="flex items-center gap-2 whitespace-nowrap">
              <Button
                asChild
                className="border-slate-300 bg-white text-slate-700"
                variant="outline"
              >
                <Link href={`/admin/products/${row.original.id}/update`}>
                  Edit
                </Link>
              </Button>
              <Button
                disabled={deleteProduct.isPending}
                onClick={() => removeProduct(row.original)}
                type="button"
                variant="destructive"
              >
                {pendingProductId === row.original.id ? "Deleting…" : "Delete"}
              </Button>
            </div>
          ),
        }),
      ]),
    [deleteProduct.isPending, pendingProductId, removeProduct],
  );

  if (currentUser.isPending) {
    return <ProductsLoading />;
  }

  if (currentUser.isError) {
    return (
      <p className="text-sm text-red-600" role="alert">
        Unable to load your store. Refresh the page and try again.
      </p>
    );
  }

  if (!currentUser.data?.tenant) {
    return <p className="text-sm text-slate-600">No store is assigned to you.</p>;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Catalog
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Products
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage product prices, stock, and storefront visibility.
          </p>
        </div>
        <Button
          asChild
          className="h-10 bg-indigo-600 px-4 text-white shadow-sm hover:bg-indigo-700"
          size="lg"
        >
          <Link href="/admin/products/create">Add product</Link>
        </Button>
      </div>

      <section className="mt-8" aria-labelledby="product-list-heading">
        <h2 className="sr-only" id="product-list-heading">
          Product list
        </h2>

        {deleteProduct.isError ? (
          <div
            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            Unable to delete this product. Please try again.
          </div>
        ) : null}

        {products.isPending ? (
          <ProductListLoading />
        ) : products.isError ? (
          <div
            className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
            role="alert"
          >
            Unable to load products. Refresh the page and try again.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-900">All products</p>
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                {products.data.length}
              </span>
            </div>
            <DataTable
              columns={columns}
              data={products.data}
              emptyMessage={
                products.data.length === 0
                  ? "No products yet. Add your first product to get started."
                  : "No products match your search or status filter."
              }
              filters={productFilters}
              getRowId={getProductRowId}
              search={productSearch}
            />
          </div>
        )}
      </section>
    </div>
  );
}

function ProductsLoading() {
  return (
    <div className="mx-auto max-w-6xl" aria-label="Loading store">
      <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
      <div className="mt-3 h-9 w-40 animate-pulse rounded bg-slate-200" />
      <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-slate-200" />
      <div className="mt-8">
        <ProductListLoading />
      </div>
    </div>
  );
}

function ProductListLoading() {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
      aria-label="Loading products"
    >
      <div className="h-16 animate-pulse border-b border-slate-200 bg-slate-50" />
      {[1, 2, 3].map((item) => (
        <div
          className="h-18 animate-pulse border-b border-slate-100 last:border-b-0"
          key={item}
        />
      ))}
    </div>
  );
}
