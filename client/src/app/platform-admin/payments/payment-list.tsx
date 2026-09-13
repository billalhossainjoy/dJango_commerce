"use client";

import { useMemo } from "react";

import type { PlatformPayment } from "@/app/platform-admin/payments/payment.service";
import { usePlatformPayments } from "@/app/platform-admin/payments/use-payments";
import {
  createDataTableColumnHelper,
  DataTable,
  type DataTableFilter,
} from "@/components/ui/data-table";

const columnHelper = createDataTableColumnHelper<PlatformPayment>();
const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

function paymentRowId(payment: PlatformPayment) {
  return String(payment.id);
}

export function PlatformPaymentList() {
  const payments = usePlatformPayments();
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("tenant_name", {
          header: "Tenant",
          cell: ({ row }) => (
            <div>
              <p className="font-semibold text-slate-900">
                {row.original.tenant_name}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {row.original.tenant_slug}
              </p>
            </div>
          ),
        }),
        columnHelper.accessor("stripe_invoice_id", {
          header: "Stripe invoice",
          filterFn: "includesString",
          cell: ({ row }) => (
            <div>
              <p className="font-mono text-xs font-medium text-slate-800">
                {row.original.stripe_invoice_id}
              </p>
              <p className="mt-1 font-mono text-[11px] text-slate-400">
                {row.original.stripe_customer_id}
              </p>
            </div>
          ),
        }),
        columnHelper.accessor("status", {
          header: "Status",
          filterFn: "equalsString",
          cell: ({ row }) => (
            <span
              className={
                row.original.status === "paid"
                  ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-700"
                  : "inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold capitalize text-red-700"
              }
            >
              {row.original.status}
            </span>
          ),
        }),
        columnHelper.accessor("currency", {
          header: "Currency",
          filterFn: "equalsString",
          cell: ({ row }) => row.original.currency.toUpperCase(),
        }),
        columnHelper.accessor("amount_paid_cents", {
          header: "Paid",
          cell: ({ row }) => (
            <span className="font-semibold text-slate-900">
              {formatCurrency(
                row.original.amount_paid_cents,
                row.original.currency,
              )}
            </span>
          ),
        }),
        columnHelper.accessor("amount_due_cents", {
          header: "Due",
          cell: ({ row }) =>
            formatCurrency(row.original.amount_due_cents, row.original.currency),
        }),
        columnHelper.accessor("paid_at", {
          header: "Payment date",
          cell: ({ row }) => (
            <span className="whitespace-nowrap text-slate-500">
              {row.original.paid_at
                ? dateFormatter.format(new Date(row.original.paid_at))
                : "Not paid"}
            </span>
          ),
        }),
      ]),
    [],
  );
  const filters = useMemo<DataTableFilter[]>(() => {
    const currencies = Array.from(
      new Set(payments.data?.map((payment) => payment.currency) ?? []),
    ).sort();
    return [
      {
        columnId: "status",
        label: "statuses",
        options: [
          { label: "Paid", value: "paid" },
          { label: "Failed", value: "failed" },
        ],
      },
      {
        columnId: "currency",
        label: "currencies",
        options: currencies.map((currency) => ({
          label: currency.toUpperCase(),
          value: currency,
        })),
      },
    ];
  }, [payments.data]);

  if (payments.isPending) {
    return <div className="mt-8 h-96 animate-pulse rounded-2xl bg-white" />;
  }
  if (payments.isError) {
    return (
      <p className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Unable to load payments. Refresh the page and try again.
      </p>
    );
  }

  return (
    <div className="mt-8">
      <DataTable
        columns={columns}
        data={payments.data}
        emptyMessage="No Stripe invoice payments have been received yet."
        filters={filters}
        getRowId={paymentRowId}
        search={{
          columnId: "stripe_invoice_id",
          placeholder: "Search by Stripe invoice ID…",
        }}
      />
    </div>
  );
}

function formatCurrency(amountCents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountCents / 100);
  } catch {
    return `${currency.toUpperCase()} ${(amountCents / 100).toFixed(2)}`;
  }
}
