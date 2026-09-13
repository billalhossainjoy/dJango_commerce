import type { Metadata } from "next";

import { PlatformPaymentList } from "@/app/platform-admin/payments/payment-list";

export const metadata: Metadata = { title: "Platform payments" };

export default function PlatformPaymentsPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
        Platform revenue
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        Payments
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Review successful and failed Stripe subscription invoices by tenant.
      </p>
      <PlatformPaymentList />
    </div>
  );
}
