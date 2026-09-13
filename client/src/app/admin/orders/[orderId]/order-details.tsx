"use client";

import Link from "next/link";

import {
  fulfillmentLabels,
  nextFulfillmentStatus,
} from "@/app/admin/orders/order-status";
import {
  useAdminOrder,
  useCancelOrder,
  useUpdateOrderFulfillment,
} from "@/app/admin/orders/use-orders";
import { formatUsd } from "@/lib/format";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "long",
  timeStyle: "short",
});

export function OrderDetails({ orderId }: { orderId: string }) {
  const order = useAdminOrder(orderId);
  const updateFulfillment = useUpdateOrderFulfillment();
  const cancelOrder = useCancelOrder();

  if (order.isPending) return <OrderDetailsLoading />;

  if (order.isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        This order could not be loaded. It may not belong to your store.
      </div>
    );
  }

  const nextStatus = nextFulfillmentStatus[order.data.fulfillment_status];
  const canCancel =
    order.data.status === "confirmed" &&
    ["unfulfilled", "processing"].includes(order.data.fulfillment_status);
  const isUpdating = updateFulfillment.isPending || cancelOrder.isPending;

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        href="/admin/orders"
      >
        ← Back to orders
      </Link>
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Order details
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            #{order.data.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Placed {dateFormatter.format(new Date(order.data.created_at))}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {canCancel ? (
            <button
              className="h-11 rounded-xl border border-red-200 bg-white px-5 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
              disabled={isUpdating}
              onClick={() => {
                if (window.confirm("Cancel this order and restore its stock?")) {
                  cancelOrder.mutate(order.data.id);
                }
              }}
              type="button"
            >
              {cancelOrder.isPending ? "Cancelling…" : "Cancel order"}
            </button>
          ) : null}
          {nextStatus && order.data.status !== "cancelled" ? (
            <button
              className="h-11 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
              disabled={isUpdating}
              onClick={() =>
                updateFulfillment.mutate({
                  orderId: order.data.id,
                  fulfillmentStatus: nextStatus,
                })
              }
              type="button"
            >
              {updateFulfillment.isPending
                ? "Updating…"
                : `Mark as ${fulfillmentLabels[nextStatus].toLowerCase()}`}
            </button>
          ) : null}
        </div>
      </div>

      {updateFulfillment.isError || cancelOrder.isError ? (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Unable to update this order. Refresh and try again.
        </p>
      ) : null}

      {order.data.status === "cancelled" ? (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          This order was cancelled. Its reserved inventory has been restored.
        </p>
      ) : null}

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-bold text-slate-950">Fulfillment progress</h2>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            {fulfillmentLabels[order.data.fulfillment_status]}
          </span>
        </div>
        <FulfillmentProgress status={order.data.fulfillment_status} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="font-bold text-slate-950">Products</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {order.data.items.map((item) => (
              <div className="flex items-center justify-between gap-6 px-6 py-5" key={item.id}>
                <div>
                  <p className="font-semibold text-slate-900">{item.product_name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatUsd(item.unit_price_cents)} × {item.quantity}
                  </p>
                </div>
                <p className="shrink-0 font-semibold text-slate-900">
                  {formatUsd(item.line_total_cents)}
                </p>
              </div>
            ))}
          </div>
          <dl className="space-y-3 border-t border-slate-200 bg-slate-50 px-6 py-5 text-sm">
            <TotalRow label="Subtotal" value={order.data.subtotal_cents} />
            <TotalRow label="Shipping" value={order.data.shipping_cents} />
            <TotalRow label="Total" value={order.data.total_cents} total />
          </dl>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-slate-950">Customer</h2>
            <p className="mt-4 font-medium text-slate-900">
              {order.data.shipping_name}
            </p>
            <p className="mt-1 break-all text-sm text-slate-500">
              {order.data.email}
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-slate-950">Delivery address</h2>
            <address className="mt-4 text-sm not-italic leading-6 text-slate-600">
              {order.data.shipping_address_line_1}
              {order.data.shipping_address_line_2 ? (
                <><br />{order.data.shipping_address_line_2}</>
              ) : null}
              <br />
              {order.data.shipping_city}
              {order.data.shipping_region ? `, ${order.data.shipping_region}` : ""}
              <br />
              {order.data.shipping_postal_code}, {order.data.shipping_country_code}
            </address>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-slate-950">Payment</h2>
            <p className="mt-3 text-sm font-medium text-slate-700">
              Cash on delivery
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function FulfillmentProgress({
  status,
}: {
  status: "unfulfilled" | "processing" | "shipped" | "delivered";
}) {
  const steps = ["unfulfilled", "processing", "shipped", "delivered"] as const;
  const currentIndex = steps.indexOf(status);
  return (
    <ol className="mt-6 grid grid-cols-4">
      {steps.map((step, index) => (
        <li className="relative text-center" key={step}>
          {index > 0 ? (
            <span
              className={`absolute right-1/2 top-3 h-0.5 w-full ${index <= currentIndex ? "bg-indigo-600" : "bg-slate-200"}`}
            />
          ) : null}
          <span
            className={`relative mx-auto grid size-6 place-items-center rounded-full text-[10px] font-bold ${index <= currentIndex ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"}`}
          >
            {index + 1}
          </span>
          <span className="relative mt-2 block text-xs font-medium text-slate-600">
            {fulfillmentLabels[step]}
          </span>
        </li>
      ))}
    </ol>
  );
}

function TotalRow({ label, value, total = false }: { label: string; value: number; total?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${total ? "border-t border-slate-200 pt-3 text-base font-bold" : ""}`}>
      <dt>{label}</dt>
      <dd>{formatUsd(value)}</dd>
    </div>
  );
}

function OrderDetailsLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse" aria-label="Loading order">
      <div className="h-4 w-28 rounded bg-slate-200" />
      <div className="mt-6 h-10 w-52 rounded bg-slate-200" />
      <div className="mt-8 h-32 rounded-2xl bg-white" />
      <div className="mt-6 h-80 rounded-2xl bg-white" />
    </div>
  );
}
