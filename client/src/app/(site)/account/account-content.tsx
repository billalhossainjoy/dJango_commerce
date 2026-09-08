"use client";

import Link from "next/link";

import { useAccountTenantSlug } from "@/app/(site)/account/account-shell";
import { useCurrentCustomer } from "@/hooks/use-current-customer";

export function AccountContent() {
  const tenantSlug = useAccountTenantSlug();
  const customer = useCurrentCustomer(tenantSlug);

  if (customer.isPending) {
    return <p role="status" className="text-sm text-muted-foreground">Loading your account…</p>;
  }
  if (customer.isError) {
    return <p role="alert" className="text-sm text-destructive">Unable to load your account.</p>;
  }

  return (
    <div>
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-700">
          Overview
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
          Welcome back
        </h2>
        <p className="mt-2 text-zinc-600">
          Review your orders and manage your customer account.
        </p>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Link
          href="/account/orders"
          className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <p className="text-sm font-medium text-zinc-500">Order history</p>
          <h3 className="mt-2 text-xl font-semibold text-zinc-950">
            View your orders
          </h3>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Track past purchases and view order details when available.
          </p>
          <span className="mt-6 inline-block text-sm font-semibold text-indigo-700 group-hover:text-indigo-800">
            Go to orders →
          </span>
        </Link>

        <Link
          href="/account/settings"
          className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <p className="text-sm font-medium text-zinc-500">Account details</p>
          <h3 className="mt-2 break-words text-xl font-semibold text-zinc-950">
            {customer.data.email}
          </h3>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Review your identity, store membership, and session settings.
          </p>
          <span className="mt-6 inline-block text-sm font-semibold text-indigo-700 group-hover:text-indigo-800">
            Manage settings →
          </span>
        </Link>
      </div>

      <section className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-950 p-6 text-white shadow-sm">
        <p className="text-sm text-zinc-400">Continue shopping</p>
        <h3 className="mt-2 text-xl font-semibold">Discover the latest products</h3>
        <p className="mt-2 text-sm text-zinc-300">
          Return to the storefront and browse the current collection.
        </p>
        <Link
          href="/#products"
          className="mt-6 inline-block rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
        >
          Browse products
        </Link>
      </section>
    </div>
  );
}
