"use client";

import Link from "next/link";

import { useStorefrontProducts } from "@/app/(site)/products/use-products";
import { StorefrontProductCard } from "@/components/storefront-product-card";
import { useTenantQuery } from "@/hooks/use-tenant-query";

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

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <section className="relative overflow-hidden bg-zinc-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(99,102,241,0.24),transparent_32%),radial-gradient(circle_at_85%_85%,rgba(168,85,247,0.18),transparent_30%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 py-16 sm:py-24 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.95fr)] lg:py-28">
          <div className="max-w-2xl">
            <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">
              Welcome to {tenant.data.name}
            </p>
            <h1 className="mt-7 text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              Thoughtful finds for everyday life.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-300">
              Explore a carefully selected collection from {tenant.data.name},
              with a simple and secure shopping experience from discovery to
              delivery.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="#products"
                className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-indigo-50"
              >
                Explore the collection
              </Link>
              <Link
                href="/account"
                className="rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                My account
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/10 pt-6 text-sm text-zinc-400">
              <span>Curated selection</span>
              <span>Secure checkout</span>
              <span>Direct from the store</span>
            </div>
          </div>

          <div className="relative mx-auto aspect-[4/5] w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/15 bg-gradient-to-br from-indigo-500/25 via-white/5 to-fuchsia-500/20 p-8 shadow-2xl shadow-black/30 sm:aspect-[5/4] lg:aspect-[4/5]">
            <div className="absolute -right-20 -top-20 size-64 rounded-full border border-white/10 bg-indigo-400/10" />
            <div className="absolute -bottom-24 -left-16 size-72 rounded-full border border-white/10 bg-fuchsia-400/10" />
            <div className="relative flex h-full flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.06] p-7 backdrop-blur-sm">
              <span className="w-fit rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">
                Online store
              </span>
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-zinc-400">
                  Discover something new
                </p>
                <p className="mt-3 text-4xl font-semibold tracking-tight text-white">
                  {tenant.data.name}
                </p>
                <div className="mt-6 h-px w-20 bg-indigo-300/70" />
              </div>
            </div>
          </div>
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
