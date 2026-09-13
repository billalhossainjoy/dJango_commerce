"use client";

import Link from "next/link";
import { use } from "react";

import { usePlatformTenant } from "@/app/platform-admin/tenants/use-tenants";

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "long" });

export default function PlatformTenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const tenant = usePlatformTenant(id);

  if (tenant.isPending) {
    return <div className="mx-auto h-80 max-w-5xl animate-pulse rounded-2xl bg-white" />;
  }

  if (tenant.isError) {
    return (
      <p className="mx-auto max-w-5xl rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Unable to load this tenant.
      </p>
    );
  }

  const details = tenant.data;
  const metrics = [
    ["Products", details.product_count],
    ["Customers", details.customer_count],
    ["Orders", details.order_count],
  ] as const;

  return (
    <div className="mx-auto max-w-5xl">
      <Link className="text-sm font-medium text-cyan-700 hover:text-cyan-900" href="/platform-admin/tenants">
        ← Back to tenants
      </Link>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Tenant
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              {details.name}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{details.slug}</p>
          </div>
          <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold capitalize text-slate-700">
            {details.status}
          </span>
        </div>

        <dl className="mt-8 grid gap-4 border-y border-slate-200 py-6 sm:grid-cols-3">
          {metrics.map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-slate-500">{label}</dt>
              <dd className="mt-1 text-2xl font-bold text-slate-950">{value}</dd>
            </div>
          ))}
        </dl>

        <dl className="mt-6 grid gap-5 text-sm sm:grid-cols-2">
          <Detail label="Owner" value={details.owner_email} />
          <Detail
            label="Subscription"
            value={details.subscription_status.replaceAll("_", " ")}
          />
          <Detail
            label="Billing"
            value={details.billing_required ? "Required" : "Grandfathered"}
          />
          <Detail
            label="Created"
            value={dateFormatter.format(new Date(details.created_at))}
          />
        </dl>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold capitalize text-slate-900">{value}</dd>
    </div>
  );
}
