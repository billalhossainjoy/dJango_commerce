"use client";

import { useTenantQuery } from "@/hooks/use-tenant-query";

export function Storefront({ tenantSlug }: { tenantSlug: string | null }) {
  const { data: tenant, isError, isPending } = useTenantQuery(tenantSlug);

  if (tenantSlug && isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 text-zinc-600">
        Loading store…
      </main>
    );
  }

  if (isError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 text-zinc-950">
        <div className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight">
            Store unavailable
          </h1>
          <p className="mt-4 text-zinc-600">Please try again shortly.</p>
        </div>
      </main>
    );
  }

  if (!tenant) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 text-zinc-950">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
            Unknown hostname
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Store not found
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <section className="mx-auto max-w-6xl px-6 py-24">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
          {tenant.slug}
        </p>
        <h2 className="mt-4 max-w-2xl text-5xl font-semibold tracking-tight">
          Welcome to {tenant.name}
        </h2>
        <p className="mt-6 text-lg text-zinc-600">
          Products are coming next.
        </p>
      </section>
    </main>
  );
}
