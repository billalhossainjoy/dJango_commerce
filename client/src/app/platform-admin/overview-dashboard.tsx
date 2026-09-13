"use client";

import { usePlatformOverview } from "@/app/platform-admin/use-platform-overview";

export function PlatformOverviewDashboard() {
  const overview = usePlatformOverview();

  if (overview.isPending) {
    return (
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-2xl bg-white shadow-sm"
          />
        ))}
      </div>
    );
  }

  if (overview.isError) {
    return (
      <p className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Unable to load platform metrics. Refresh the page and try again.
      </p>
    );
  }

  const { tenants, subscriptions, payments } = overview.data;

  return (
    <div className="mt-8 space-y-8">
      <section aria-labelledby="tenant-metrics-title">
        <SectionHeading
          id="tenant-metrics-title"
          title="Tenants"
          description="Store creation and activation across the platform."
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total tenants" value={tenants.total} />
          <MetricCard label="Active stores" value={tenants.active} tone="success" />
          <MetricCard label="Awaiting activation" value={tenants.provisioning} />
          <MetricCard
            label="Billing required"
            value={tenants.billing_required}
            tone="accent"
          />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {tenants.suspended} suspended · {tenants.closed} closed
        </p>
      </section>

      <section aria-labelledby="subscription-metrics-title">
        <SectionHeading
          id="subscription-metrics-title"
          title="Subscriptions"
          description="Current Stripe subscription health."
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Subscriptions" value={subscriptions.total} />
          <MetricCard label="Active" value={subscriptions.active} tone="success" />
          <MetricCard label="Free trials" value={subscriptions.trialing} tone="accent" />
          <MetricCard label="Past due" value={subscriptions.past_due} tone="warning" />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {subscriptions.canceled} canceled
        </p>
      </section>

      <section aria-labelledby="payment-metrics-title">
        <SectionHeading
          id="payment-metrics-title"
          title="Payments"
          description="Collected Stripe subscription invoices, separated by currency."
        />
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Collected revenue</p>
            {payments.collected.length ? (
              <div className="mt-4 flex flex-wrap gap-3">
                {payments.collected.map((amount) => (
                  <span
                    key={amount.currency}
                    className="rounded-xl bg-slate-950 px-4 py-3 text-xl font-bold text-white"
                  >
                    {formatCurrency(amount.amount_cents, amount.currency)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-2xl font-bold text-slate-950">No payments yet</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <MetricCard label="Paid invoices" value={payments.paid} tone="success" />
            <MetricCard label="Failed invoices" value={payments.failed} tone="warning" />
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeading({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 id={id} className="text-lg font-bold text-slate-950">
        {title}
      </h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "warning" | "accent";
}) {
  const tones = {
    default: "bg-white text-slate-950",
    success: "bg-emerald-50 text-emerald-950",
    warning: "bg-amber-50 text-amber-950",
    accent: "bg-cyan-50 text-cyan-950",
  };

  return (
    <div className={`rounded-2xl border border-slate-200 p-5 shadow-sm ${tones[tone]}`}>
      <p className="text-sm font-medium opacity-65">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight">{value}</p>
    </div>
  );
}

function formatCurrency(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}
