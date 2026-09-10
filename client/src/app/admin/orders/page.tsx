"use client";

import { useMemo } from "react";
import Link from "next/link";

import type { AdminOrder } from "@/app/admin/orders/order.service";
import {
  fulfillmentLabels,
  nextFulfillmentStatus,
} from "@/app/admin/orders/order-status";
import {
  useAdminOrders,
  useUpdateOrderFulfillment,
} from "@/app/admin/orders/use-orders";
import {
  createDataTableColumnHelper,
  DataTable,
  type DataTableFilter,
} from "@/components/ui/data-table";
import { useCurrentUser } from "@/hooks/use-current-user";
import { formatUsd } from "@/lib/format";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});
const orderColumnHelper = createDataTableColumnHelper<AdminOrder>();
const orderFilters: DataTableFilter[] = [
  {
    columnId: "status",
    label: "statuses",
    options: [
      { label: "Confirmed", value: "confirmed" },
      { label: "Pending payment", value: "pending_payment" },
      { label: "Paid", value: "paid" },
      { label: "Cancelled", value: "cancelled" },
    ],
  },
  {
    columnId: "fulfillment_status",
    label: "fulfillment statuses",
    options: [
      { label: "Unfulfilled", value: "unfulfilled" },
      { label: "Processing", value: "processing" },
      { label: "Shipped", value: "shipped" },
      { label: "Delivered", value: "delivered" },
    ],
  },
];

const statusLabels: Record<AdminOrder["status"], string> = {
  pending_payment: "Pending payment",
  confirmed: "Confirmed",
  paid: "Paid",
  cancelled: "Cancelled",
};

function getOrderRowId(order: AdminOrder) {
  return order.id;
}

export default function OrdersPage() {
  const currentUser = useCurrentUser();
  const orders = useAdminOrders();
  const updateFulfillment = useUpdateOrderFulfillment();
  const columns = useMemo(
    () =>
      orderColumnHelper.columns([
        orderColumnHelper.accessor("email", {
          header: "Order / customer",
          filterFn: "includesString",
          cell: ({ row }) => (
            <div>
              <p className="font-semibold text-slate-900">
                #{row.original.id.slice(0, 8).toUpperCase()}
              </p>
              <p className="mt-1 text-xs text-slate-500">{row.original.email}</p>
            </div>
          ),
        }),
        orderColumnHelper.accessor(
          (order) => order.items.reduce((total, item) => total + item.quantity, 0),
          {
            id: "item_count",
            header: "Items",
            cell: ({ getValue }) => getValue(),
          },
        ),
        orderColumnHelper.accessor("status", {
          header: "Status",
          filterFn: "equalsString",
          cell: ({ getValue }) => (
            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              {statusLabels[getValue()]}
            </span>
          ),
        }),
        orderColumnHelper.accessor("fulfillment_status", {
          header: "Fulfillment",
          filterFn: "equalsString",
          cell: ({ getValue }) => (
            <span className="font-medium text-slate-700">
              {fulfillmentLabels[getValue()]}
            </span>
          ),
        }),
        orderColumnHelper.accessor("payment_method", {
          header: "Payment",
          cell: () => <span className="text-slate-600">Cash on delivery</span>,
        }),
        orderColumnHelper.accessor("total_cents", {
          header: "Total",
          cell: ({ getValue }) => (
            <span className="whitespace-nowrap font-semibold text-slate-900">
              {formatUsd(getValue())}
            </span>
          ),
        }),
        orderColumnHelper.accessor("created_at", {
          header: "Placed",
          cell: ({ getValue }) => (
            <span className="whitespace-nowrap text-slate-500">
              {dateFormatter.format(new Date(getValue()))}
            </span>
          ),
        }),
        orderColumnHelper.display({
          id: "actions",
          header: "Actions",
          cell: ({ row }) => {
            const nextStatus = nextFulfillmentStatus[row.original.fulfillment_status];
            if (!nextStatus || row.original.status === "cancelled") {
              return (
                <Link
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  href={`/admin/orders/${row.original.id}`}
                >
                  View
                </Link>
              );
            }
            const isUpdating =
              updateFulfillment.isPending &&
              updateFulfillment.variables.orderId === row.original.id;
            return (
              <div className="flex items-center gap-2">
                <Link
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  href={`/admin/orders/${row.original.id}`}
                >
                  View
                </Link>
                <button
                  className="whitespace-nowrap rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
                  disabled={updateFulfillment.isPending}
                  onClick={() =>
                    updateFulfillment.mutate({
                      orderId: row.original.id,
                      fulfillmentStatus: nextStatus,
                    })
                  }
                  type="button"
                >
                  {isUpdating
                    ? "Updating…"
                    : `Mark ${fulfillmentLabels[nextStatus].toLowerCase()}`}
                </button>
              </div>
            );
          },
        }),
      ]),
    [updateFulfillment],
  );

  if (currentUser.isPending) return <OrdersLoading />;

  if (currentUser.isError) {
    return (
      <p className="text-sm text-red-600" role="alert">
        Unable to load your store. Refresh the page and try again.
      </p>
    );
  }

  if (!currentUser.data?.tenant) {
    return <p className="text-sm text-slate-600">No store is assigned to you.</p>;
  }

  return (
    <div className="mx-auto max-w-7xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
        Store operations
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        Orders
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Review cash-on-delivery orders placed through your storefront.
      </p>

      <section className="mt-8" aria-labelledby="order-list-heading">
        <h2 className="sr-only" id="order-list-heading">
          Order list
        </h2>
        {updateFulfillment.isError ? (
          <div
            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            Unable to update the order status. Refresh and try again.
          </div>
        ) : null}
        {orders.isPending ? (
          <OrderListLoading />
        ) : orders.isError ? (
          <div
            className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
            role="alert"
          >
            Unable to load orders. Refresh the page and try again.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-900">All orders</p>
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                {orders.data.length}
              </span>
            </div>
            <DataTable
              columns={columns}
              data={orders.data}
              emptyMessage="No orders have been placed yet."
              filters={orderFilters}
              getRowId={getOrderRowId}
              search={{ columnId: "email", placeholder: "Search by email…" }}
            />
          </div>
        )}
      </section>
    </div>
  );
}

function OrdersLoading() {
  return (
    <div className="mx-auto max-w-7xl" aria-label="Loading store orders">
      <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
      <div className="mt-3 h-9 w-44 animate-pulse rounded bg-slate-200" />
      <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-slate-200" />
      <div className="mt-8">
        <OrderListLoading />
      </div>
    </div>
  );
}

function OrderListLoading() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="h-16 animate-pulse border-b border-slate-200 bg-slate-50" />
      {[1, 2, 3].map((item) => (
        <div
          className="h-18 animate-pulse border-b border-slate-100 last:border-b-0"
          key={item}
        />
      ))}
    </div>
  );
}
