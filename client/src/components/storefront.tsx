"use client";

import Image from "next/image";
import Link from "next/link";

import { useStorefrontProducts } from "@/app/(site)/products/use-products";
import { StorefrontProductCard } from "@/components/storefront-product-card";
import { useTenantQuery } from "@/hooks/use-tenant-query";
import { formatUsd } from "@/lib/format";

export function Storefront({ tenantSlug }: { tenantSlug: string | null }) {
  const tenant = useTenantQuery(tenantSlug);
  const products = useStorefrontProducts(tenantSlug);

  if (tenantSlug && (tenant.isPending || products.isPending)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 text-zinc-600">
        Loading store…
      </div>
    );
  }

  if (tenant.isError || products.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 text-zinc-950">
        <div className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight">
            Store unavailable
          </h1>
          <p className="mt-4 text-zinc-600">Please try again shortly.</p>
        </div>
      </div>
    );
  }

  if (!tenant.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 text-zinc-950">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
            Unknown hostname
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Store not found
          </h1>
        </div>
      </div>
    );
  }

  const featuredProduct = products.data?.[0];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <section className="relative overflow-hidden bg-zinc-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.35),transparent_40%)]" />
        <div
          className={`relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 sm:py-24 ${
            featuredProduct ? "lg:grid-cols-2" : ""
          }`}
        >
          <div className="max-w-2xl">
            <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">
              {tenant.data.slug} storefront
            </p>
            <h1 className="mt-6 text-5xl font-semibold tracking-tight sm:text-6xl">
              Find your next favorite from {tenant.data.name}.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-300">
              Browse our current collection and discover products available
              directly from our store.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="#products"
                className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-indigo-50"
              >
                Shop products
              </Link>
              <Link
                href="/account"
                className="rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                My account
              </Link>
            </div>
          </div>

          {featuredProduct ? (
            <Link
              href={`/products/${featuredProduct.slug}`}
              className="group relative mx-auto w-full max-w-lg overflow-hidden rounded-3xl border border-white/15 bg-white/10 p-3 shadow-2xl shadow-indigo-950/40"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-zinc-800">
                {featuredProduct.images[0]?.url ? (
                  <Image
                    src={featuredProduct.images[0].url}
                    alt={
                      featuredProduct.images[0].alt_text || featuredProduct.name
                    }
                    fill
                    priority
                    unoptimized
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-zinc-500">
                    No image
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-4 px-2 pb-2 pt-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
                    Featured product
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">
                    {featuredProduct.name}
                  </h2>
                </div>
                <p className="text-lg font-semibold">
                  {formatUsd(featuredProduct.price_cents)}
                </p>
              </div>
            </Link>
          ) : null}
        </div>
      </section>

      <section id="products" className="scroll-mt-20 bg-zinc-50">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-700">
                Our collection
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Shop all products
              </h2>
            </div>
            {products.data?.length ? (
              <p className="text-sm text-zinc-500">
                {products.data.length} product
                {products.data.length === 1 ? "" : "s"}
              </p>
            ) : null}
          </div>

        {products.data?.length ? (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.data.map((product) => (
              <StorefrontProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mt-12 rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
            <h3 className="font-semibold text-zinc-950">No products yet</h3>
            <p className="mt-2 text-sm text-zinc-600">
              This store is preparing its first products.
            </p>
          </div>
        )}
        </div>
      </section>
    </div>
  );
}
