import type { Metadata } from "next";
import { Suspense } from "react";

import { BillingPanel } from "@/app/admin/billing/billing-panel";

export const metadata: Metadata = { title: "Billing" };

export default function BillingPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
        Subscription
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        Billing
      </h1>
      <p className="mb-8 mt-2 text-sm text-slate-500">
        Start your free trial and review your current subscription status.
      </p>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-white" />}>
        <BillingPanel />
      </Suspense>
    </div>
  );
}
