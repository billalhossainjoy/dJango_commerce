"use client";

import { useCallback, useMemo } from "react";

import type { AdminCustomer } from "@/app/admin/customers/customer.service";
import {
  useCustomers,
  useSetCustomerActive,
} from "@/app/admin/customers/use-customers";
import { Button } from "@/components/ui/button";
import {
  createDataTableColumnHelper,
  DataTable,
  type DataTableFilter,
} from "@/components/ui/data-table";
import { useCurrentUser } from "@/hooks/use-current-user";

const joinedDateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
});
const customerColumnHelper = createDataTableColumnHelper<AdminCustomer>();
const customerFilters: DataTableFilter[] = [
  {
    columnId: "status",
    label: "statuses",
    options: [
      { label: "Active", value: "active" },
      { label: "Blocked", value: "blocked" },
    ],
  },
];
const customerSearch = {
  columnId: "email",
  placeholder: "Search customers by email…",
};

function getCustomerRowId(customer: AdminCustomer) {
  return customer.id;
}

export default function CustomersPage() {
  const currentUser = useCurrentUser();
  const customers = useCustomers();
  const setCustomerActive = useSetCustomerActive();
  const updateCustomerStatus = setCustomerActive.mutate;
  const pendingCustomerId = setCustomerActive.isPending
    ? setCustomerActive.variables.customerId
    : null;

  const changeCustomerStatus = useCallback(
    (customer: AdminCustomer) => {
      const action = customer.is_active ? "block" : "unblock";
      if (
        window.confirm(
          `Are you sure you want to ${action} ${customer.email}?`,
        )
      ) {
        updateCustomerStatus({
          customerId: customer.id,
          isActive: !customer.is_active,
        });
      }
    },
    [updateCustomerStatus],
  );
  const columns = useMemo(
    () =>
      customerColumnHelper.columns([
        customerColumnHelper.accessor("email", {
          header: "Customer",
          filterFn: "includesString",
          cell: ({ row }) => (
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 font-bold text-indigo-600">
                {row.original.email.charAt(0).toUpperCase()}
              </span>
              <span className="font-medium text-slate-900">
                {row.original.email}
              </span>
            </div>
          ),
        }),
        customerColumnHelper.accessor(
          (customer) => (customer.is_active ? "active" : "blocked"),
          {
            id: "status",
            header: "Status",
            filterFn: "equalsString",
            cell: ({ row }) => (
              <span
                className={
                  row.original.is_active
                    ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                    : "inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
                }
              >
                {row.original.is_active ? "Active" : "Blocked"}
              </span>
            ),
          },
        ),
        customerColumnHelper.accessor("date_joined", {
          header: "Joined",
          cell: ({ row }) => (
            <span className="whitespace-nowrap text-slate-500">
              {joinedDateFormatter.format(new Date(row.original.date_joined))}
            </span>
          ),
        }),
        customerColumnHelper.display({
          id: "actions",
          header: "Actions",
          cell: ({ row }) => (
            <Button
              aria-label={`${row.original.is_active ? "Block" : "Unblock"} ${row.original.email}`}
              className={
                row.original.is_active
                  ? undefined
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }
              disabled={setCustomerActive.isPending}
              onClick={() => changeCustomerStatus(row.original)}
              type="button"
              variant={row.original.is_active ? "destructive" : "outline"}
            >
              {pendingCustomerId === row.original.id
                ? "Updating…"
                : row.original.is_active
                  ? "Block"
                  : "Unblock"}
            </Button>
          ),
        }),
      ]),
    [changeCustomerStatus, pendingCustomerId, setCustomerActive.isPending],
  );

  if (currentUser.isPending) {
    return <CustomersLoading />;
  }

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
    <div className="mx-auto max-w-6xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
          Store audience
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Customers
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          View the customer accounts registered with your storefront.
        </p>
      </div>

      <section className="mt-8" aria-labelledby="customer-list-heading">
        <h2 className="sr-only" id="customer-list-heading">
          Customer list
        </h2>

        {setCustomerActive.isError ? (
          <div
            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            Unable to update this customer. Please try again.
          </div>
        ) : null}

        {customers.isPending ? (
          <CustomerListLoading />
        ) : customers.isError ? (
          <div
            className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
            role="alert"
          >
            Unable to load customers. Refresh the page and try again.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-900">All customers</p>
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                {customers.data.length}
              </span>
            </div>
            <DataTable
              columns={columns}
              data={customers.data}
              emptyMessage={
                <div>
                  <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <CustomerIcon />
                  </div>
                  <p className="mt-4 font-semibold text-slate-900">
                    No customers found
                  </p>
                  <p className="mt-1">
                    Try changing your search or status filter.
                  </p>
                </div>
              }
              filters={customerFilters}
              getRowId={getCustomerRowId}
              search={customerSearch}
            />
          </div>
        )}
      </section>
    </div>
  );
}

function CustomersLoading() {
  return (
    <div className="mx-auto max-w-6xl" aria-label="Loading store">
      <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
      <div className="mt-3 h-9 w-44 animate-pulse rounded bg-slate-200" />
      <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-slate-200" />
      <div className="mt-8">
        <CustomerListLoading />
      </div>
    </div>
  );
}

function CustomerListLoading() {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
      aria-label="Loading customers"
    >
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

function CustomerIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-6"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
