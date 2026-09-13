"use client";

import Link from "next/link";

import { useOrder } from "@/app/(site)/checkout/use-checkout";
import { formatUsd } from "@/lib/format";

export function OrderConfirmation({
  tenantSlug,
  orderId,
}: {
  tenantSlug: string;
  orderId: string;
}) {
  const order = useOrder(tenantSlug, orderId);

  if (order.isPending) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-2xl px-6 py-16 text-zinc-600">
        Loading your order…
      </main>
    );
  }

  if (order.isError) {
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-950">
        <section className="mx-auto max-w-2xl rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm sm:p-12">
          <h1 className="text-3xl font-semibold">Order unavailable</h1>
          <p className="mt-3 text-zinc-600">
            This order does not belong to the current customer or browser session.
          </p>
          <Link className="mt-7 inline-block font-semibold text-indigo-700" href="/">
            Return to store →
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-950">
      <section className="mx-auto max-w-2xl rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm sm:p-12">
        <div className="grid size-14 place-items-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
          ✓
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
          Order created
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Thank you for your order
        </h1>
        <p className="mt-3 break-all text-zinc-600">
          Order <span className="font-medium">{order.data.id}</span>
        </p>

        <div className="mt-8 divide-y divide-zinc-200 border-y border-zinc-200">
          {order.data.items.map((item) => (
            <div key={item.id} className="flex justify-between gap-6 py-4 text-sm">
              <span className="text-zinc-700">
                {item.product_name} × {item.quantity}
              </span>
              <span className="shrink-0 font-semibold">
                {formatUsd(item.line_total_cents)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between text-lg">
          <span className="font-semibold">Total</span>
          <span className="font-bold">{formatUsd(order.data.total_cents)}</span>
        </div>
        <p className="mt-6 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
          Payment method: cash on delivery. Please pay when your order arrives.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Return to store
        </Link>
      </section>
    </main>
  );
}
