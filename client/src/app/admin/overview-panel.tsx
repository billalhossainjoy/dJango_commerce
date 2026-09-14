"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { fulfillmentLabels } from "@/app/admin/orders/order-status";
import {
  type DailyActivity,
  type OverviewPeriod,
  type TenantOverview,
  getTenantOverview,
} from "@/app/admin/overview.service";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/format";
import { useAuthStore } from "@/stores/auth-store";

const number = new Intl.NumberFormat("en-US");
const date = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const panel =
  "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40 sm:p-6";
const statusLabels = {
  pending_payment: "Pending payment",
  confirmed: "Confirmed",
  paid: "Paid",
  cancelled: "Cancelled",
};
const fulfillmentColors = [
  "bg-amber-400",
  "bg-indigo-500",
  "bg-sky-400",
  "bg-emerald-400",
];

export function OverviewPanel({ tenantSlug }: { tenantSlug: string }) {
  const [days, setDays] = useState<OverviewPeriod>(30);
  const accessToken = useAuthStore((state) => state.accessToken);
  const overview = useQuery({
    queryKey: ["admin", tenantSlug, "overview", days],
    queryFn: ({ signal }) =>
      getTenantOverview(tenantSlug, days, accessToken!, signal),
    enabled: Boolean(accessToken),
    refetchInterval: 60_000,
    staleTime: 0,
  });

  return (
    <section
      className="mt-8 space-y-6"
      aria-label="Store performance"
      aria-busy={overview.isFetching}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Your store at a glance
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Track orders, keep stock moving, and see what needs attention.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => void overview.refetch()}
            disabled={overview.isFetching}
          >
            {overview.isFetching ? "Updating…" : "Refresh"}
          </Button>
          <label className="sr-only" htmlFor="overview-period">
            Chart period
          </label>
          <select
            id="overview-period"
            value={days}
            onChange={(event) =>
              setDays(Number(event.target.value) as OverviewPeriod)
            }
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus-visible:outline-2 focus-visible:outline-indigo-600"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {overview.isError ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
          role="alert"
        >
          Unable to update your overview. Use Refresh to try again.
        </div>
      ) : null}
      {overview.isPending ? (
        <div
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          role="status"
          aria-label="Loading store metrics"
        >
          {[1, 2, 3, 4].map((item) => (
            <div
              className={`${panel} h-36 animate-pulse bg-slate-100`}
              key={item}
            />
          ))}
        </div>
      ) : overview.data ? (
        <OverviewContent key={`${tenantSlug}-${days}`} data={overview.data} />
      ) : null}
    </section>
  );
}

function OverviewContent({ data }: { data: TenantOverview }) {
  const fulfillmentTotal = data.fulfillment.reduce(
    (sum, item) => sum + item.count,
    0,
  );
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          title="Products"
          value={number.format(data.products.total)}
          detail={`${number.format(data.products.active)} active · ${number.format(data.products.total - data.products.active)} draft`}
          href="/admin/products"
        />
        <Metric
          title="Total orders"
          value={number.format(data.total_orders)}
          detail={`${number.format(data.period.orders)} in the last ${data.days} days`}
          href="/admin/orders"
        />
        <Metric
          title="Customers"
          value={number.format(data.customers)}
          detail="Registered store customers"
          href="/admin/customers"
        />
        <Metric
          title="Order value"
          value={formatUsd(data.period.order_value_cents)}
          detail={`Confirmed + paid · last ${data.days} days`}
          href="/admin/orders"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <ActivityChart data={data} />
        <section className={panel} aria-labelledby="fulfillment-heading">
          <div className="flex items-center justify-between gap-3">
            <h3
              id="fulfillment-heading"
              className="font-semibold text-slate-950"
            >
              Order fulfillment
            </h3>
            <span className="text-xs text-slate-500">All time</span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {number.format(fulfillmentTotal)} confirmed and paid orders
          </p>
          <div className="mt-7 space-y-5">
            {data.fulfillment.map((item, index) => (
              <div key={item.status}>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-slate-600">
                    {fulfillmentLabels[item.status]}
                  </span>
                  <span className="font-semibold tabular-nums text-slate-900">
                    {number.format(item.count)}
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-slate-100"
                  aria-hidden="true"
                >
                  <div
                    className={`h-full rounded-full ${fulfillmentColors[index]}`}
                    style={{
                      width: `${fulfillmentTotal ? (item.count / fulfillmentTotal) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          {!fulfillmentTotal ? (
            <p className="mt-5 text-sm text-slate-500">
              New confirmed orders will appear here.
            </p>
          ) : null}
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <section
          className={`${panel} min-w-0`}
          aria-labelledby="recent-orders-heading"
        >
          <div className="flex items-center justify-between gap-4">
            <h3
              id="recent-orders-heading"
              className="font-semibold text-slate-950"
            >
              Recent orders
            </h3>
            <Link
              href="/admin/orders"
              className="text-sm font-semibold text-indigo-600 hover:underline"
            >
              View all →
            </Link>
          </div>
          {data.recent_orders.length ? (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  Your five most recent orders, across all dates
                </caption>
                <thead className="border-b border-slate-100 text-xs text-slate-500">
                  <tr>
                    <th scope="col" className="pb-3 font-medium">
                      Order / customer
                    </th>
                    <th scope="col" className="px-3 pb-3 font-medium">
                      Status
                    </th>
                    <th scope="col" className="pb-3 text-right font-medium">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recent_orders.map((order) => (
                    <tr key={order.id}>
                      <td className="py-4">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-semibold text-slate-900 hover:text-indigo-600 hover:underline"
                        >
                          #{order.id.slice(0, 8).toUpperCase()}
                        </Link>
                        <p className="mt-1 text-xs text-slate-500">
                          {order.shipping_name} ·{" "}
                          {date.format(new Date(order.created_at))}
                        </p>
                      </td>
                      <td className="px-3 py-4">
                        <span
                          className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${order.status === "cancelled" ? "bg-red-50 text-red-700" : order.status === "pending_payment" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}
                        >
                          {statusLabels[order.status]}
                        </span>
                      </td>
                      <td className="whitespace-nowrap py-4 text-right font-medium tabular-nums text-slate-700">
                        {formatUsd(order.total_cents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="font-medium text-slate-800">
                Ready for your first order
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Orders will appear here as customers check out.
              </p>
              <Link
                href="/admin/products/create"
                className="mt-4 inline-block text-sm font-semibold text-indigo-600 hover:underline"
              >
                Add a product →
              </Link>
            </div>
          )}
        </section>
        <section className={panel} aria-labelledby="inventory-heading">
          <h3 id="inventory-heading" className="font-semibold text-slate-950">
            Inventory check
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Stock levels for active products.
          </p>
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-red-50 px-4 py-4">
              <span className="text-sm font-medium text-red-800">
                Out of stock
              </span>
              <span className="text-xl font-semibold tabular-nums text-red-700">
                {number.format(data.products.out_of_stock)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-4">
              <div>
                <p className="text-sm font-medium text-amber-900">
                  Running low
                </p>
                <p className="mt-1 text-xs text-amber-700">
                  1–5 units remaining
                </p>
              </div>
              <span className="text-xl font-semibold tabular-nums text-amber-800">
                {number.format(data.products.low_stock)}
              </span>
            </div>
          </div>
          <Link
            href="/admin/products"
            className="mt-6 inline-block text-sm font-semibold text-indigo-600 hover:underline"
          >
            Manage inventory →
          </Link>
        </section>
      </div>
    </>
  );
}

function Metric({
  title,
  value,
  detail,
  href,
}: {
  title: string;
  value: string;
  detail: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`${panel} group transition-colors hover:border-indigo-300 focus-visible:outline-2 focus-visible:outline-indigo-600`}
    >
      <div className="flex items-center justify-between text-sm font-medium text-slate-500">
        <span>{title}</span>
        <span
          className="text-slate-300 group-hover:text-indigo-500"
          aria-hidden="true"
        >
          ↗
        </span>
      </div>
      <p className="mt-3 break-words text-3xl font-semibold tracking-tight tabular-nums text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </Link>
  );
}

function ActivityChart({ data }: { data: TenantOverview }) {
  const [metric, setMetric] = useState<"order_value_cents" | "orders">(
    "order_value_cents",
  );
  const [selected, setSelected] = useState<DailyActivity | null>(null);
  const maximum = Math.max(1, ...data.daily.map((day) => day[metric]));
  const format = (value: number) =>
    metric === "orders" ? number.format(value) : formatUsd(value);
  const hasActivity = data.daily.some((day) => day[metric] > 0);
  const activeDay = selected ?? data.daily[data.daily.length - 1];
  const label = metric === "orders" ? "Orders" : "Order value";
  return (
    <section className={`${panel} min-w-0`} aria-labelledby="activity-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="activity-heading" className="font-semibold text-slate-950">
            Order activity
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Daily totals · {data.timezone}
          </p>
        </div>
        <div
          className="flex rounded-lg bg-slate-100 p-1"
          role="group"
          aria-label="Chart metric"
        >
          {(["order_value_cents", "orders"] as const).map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={metric === value}
              onClick={() => setMetric(value)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-indigo-600 ${metric === value ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              {value === "orders" ? "Orders" : "Order value"}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-5 min-h-5 text-sm text-slate-600" aria-live="polite">
        {hasActivity
          ? `${date.format(new Date(`${activeDay.date}T00:00:00Z`))} · ${format(activeDay[metric])}${metric === "orders" ? " orders" : " order value"}`
          : `No ${metric === "orders" ? "orders" : "confirmed or paid orders"} in this period.`}
      </p>
      <div className="mt-4 flex gap-3">
        <div
          className="flex h-44 shrink-0 flex-col justify-between text-right text-[10px] tabular-nums text-slate-400"
          aria-hidden="true"
        >
          <span>{hasActivity ? format(maximum) : format(0)}</span>
          <span>{format(0)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="relative flex h-44 items-end gap-px border-b border-slate-200 bg-[linear-gradient(to_top,#f1f5f9_1px,transparent_1px)] bg-[size:100%_25%] sm:gap-1"
            role="group"
            aria-label={`${label} by day. Focus or select a bar for its exact value.`}
          >
            {data.daily.map((day) => (
              <button
                type="button"
                key={day.date}
                aria-label={`${day.date}: ${format(day[metric])} ${label.toLowerCase()}`}
                onFocus={() => setSelected(day)}
                onMouseEnter={() => setSelected(day)}
                onClick={() => setSelected(day)}
                className={`relative min-w-0 flex-1 rounded-t-sm focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 ${selected?.date === day.date ? "bg-indigo-800" : "bg-indigo-500 hover:bg-indigo-700"}`}
                style={{
                  height: `${Math.max(1, (day[metric] / maximum) * 100)}%`,
                  opacity: day[metric] ? 1 : 0.2,
                }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-slate-400">
            <span>
              {date.format(new Date(`${data.daily[0].date}T00:00:00Z`))}
            </span>
            <span>
              {date.format(
                new Date(`${data.daily[data.daily.length - 1].date}T00:00:00Z`),
              )}
            </span>
          </div>
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        {metric === "orders"
          ? "All orders placed in this period, including cancelled orders."
          : "Confirmed and paid order totals, including shipping. This is order value, not collected payments."}
      </p>
    </section>
  );
}
