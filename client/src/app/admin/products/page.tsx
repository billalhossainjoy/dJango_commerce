"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";

import { AppService } from "@/app/app.service";
import { ProductService } from "@/app/admin/products/product.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/auth-store";

const appService = new AppService();
const productService = new ProductService();

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useQuery({
    queryKey: ["auth", "current-user"],
    queryFn: ({ signal }) => appService.getCurrentUser(accessToken!, signal),
    enabled: accessToken !== null,
  });
  const tenantSlug = currentUser.data?.tenant?.slug;
  const productsQueryKey = ["admin", tenantSlug, "products"] as const;
  const products = useQuery({
    queryKey: productsQueryKey,
    queryFn: ({ signal }) =>
      productService.list(tenantSlug!, accessToken!, signal),
    enabled: Boolean(tenantSlug && accessToken),
  });
  const createProduct = useMutation({
    mutationFn: (form: HTMLFormElement) => {
      const data = new FormData(form);
      return productService.create(
        tenantSlug!,
        {
          name: String(data.get("name")),
          slug: String(data.get("slug")),
          description: String(data.get("description")),
          price_cents: Math.round(Number(data.get("price")) * 100),
          stock_quantity: Number(data.get("stock_quantity")),
          is_active: data.get("is_active") === "on",
        },
        accessToken!,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productsQueryKey });
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    createProduct.mutate(form, { onSuccess: () => form.reset() });
  };

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
        Products
      </h1>
      <p className="mt-2 text-sm text-zinc-600">
        Add products and manage their price, stock, and visibility.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[20rem_1fr]">
        <form
          className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5"
          onSubmit={handleSubmit}
        >
          <h2 className="font-semibold text-zinc-950">Add product</h2>
          <div className="space-y-1.5">
            <Label htmlFor="product-name">Name</Label>
            <Input id="product-name" name="name" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="product-slug">Slug</Label>
            <Input id="product-slug" name="slug" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="product-description">Description</Label>
            <textarea
              id="product-description"
              name="description"
              className="min-h-24 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="product-price">Price (USD)</Label>
              <Input
                id="product-price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="product-stock">Stock</Label>
              <Input
                id="product-stock"
                name="stock_quantity"
                type="number"
                min="0"
                step="1"
                required
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input name="is_active" type="checkbox" defaultChecked />
            Visible on storefront
          </label>
          <Button className="w-full" type="submit" disabled={createProduct.isPending}>
            {createProduct.isPending ? "Adding…" : "Add product"}
          </Button>
          {createProduct.isError ? (
            <p className="text-sm text-red-600" role="alert">
              Unable to add this product. Check the values and slug.
            </p>
          ) : null}
        </form>

        <section>
          <h2 className="font-semibold text-zinc-950">Your products</h2>
          {products.isPending ? (
            <p className="mt-4 text-sm text-zinc-600">Loading products…</p>
          ) : products.isError ? (
            <p className="mt-4 text-sm text-red-600">Unable to load products.</p>
          ) : products.data.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-600">
              No products yet.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {products.data.map((product) => (
                <article
                  key={product.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4"
                >
                  <div>
                    <h3 className="font-medium text-zinc-950">{product.name}</h3>
                    <p className="mt-1 text-sm text-zinc-500">
                      ${(product.price_cents / 100).toFixed(2)} · {product.stock_quantity} in stock
                    </p>
                  </div>
                  <span className="text-xs font-medium text-zinc-500">
                    {product.is_active ? "Active" : "Draft"}
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
