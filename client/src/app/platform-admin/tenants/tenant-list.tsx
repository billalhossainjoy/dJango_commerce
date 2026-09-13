"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";

import type { PlatformTenant } from "@/app/platform-admin/platform-admin.service";
import {
  usePlatformTenants,
  useSetPlatformTenantStatus,
} from "@/app/platform-admin/tenants/use-tenants";
import { Button } from "@/components/ui/button";
import {
  createDataTableColumnHelper,
  DataTable,
  type DataTableFilter,
} from "@/components/ui/data-table";

const columnHelper = createDataTableColumnHelper<PlatformTenant>();
const createdDateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
});
const filters: DataTableFilter[] = [
  {
    columnId: "status",
    label: "statuses",
    options: [
      { label: "Provisioning", value: "provisioning" },
      { label: "Active", value: "active" },
      { label: "Suspended", value: "suspended" },
      { label: "Closed", value: "closed" },
    ],
  },
  {
    columnId: "subscription_status",
    label: "subscriptions",
    options: [
      { label: "Not started", value: "not_started" },
      { label: "Trialing", value: "trialing" },
      { label: "Active", value: "active" },
      { label: "Past due", value: "past_due" },
      { label: "Canceled", value: "canceled" },
    ],
  },
];

function tenantRowId(tenant: PlatformTenant) {
  return tenant.id;
}

export function PlatformTenantList() {
  const tenants = usePlatformTenants();
  const setStatus = useSetPlatformTenantStatus();
  const updateStatus = setStatus.mutate;
  const changeStatus = useCallback(
    (tenant: PlatformTenant) => {
      const blocking = tenant.status === "active";
      const action = blocking ? "block" : "unblock";
      if (window.confirm(`Are you sure you want to ${action} ${tenant.name}?`)) {
        updateStatus({
          tenantId: tenant.id,
          status: blocking ? "suspended" : "active",
        });
      }
    },
    [updateStatus],
  );
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor(
          (tenant) => `${tenant.name} ${tenant.slug} ${tenant.owner_email}`,
          {
            id: "tenant",
            header: "Tenant",
            filterFn: "includesString",
            cell: ({ row }) => (
              <div>
                <p className="font-semibold text-slate-900">
                  {row.original.name}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {row.original.slug}
                </p>
              </div>
            ),
          },
        ),
        columnHelper.accessor("owner_email", {
          header: "Owner",
          cell: ({ row }) => (
            <span className="text-slate-600">{row.original.owner_email}</span>
          ),
        }),
        columnHelper.accessor("status", {
          header: "Status",
          filterFn: "equalsString",
          cell: ({ row }) => <TenantStatus status={row.original.status} />,
        }),
        columnHelper.accessor("subscription_status", {
          header: "Subscription",
          filterFn: "equalsString",
          cell: ({ row }) => (
            <span className="capitalize text-slate-600">
              {row.original.subscription_status.replaceAll("_", " ")}
            </span>
          ),
        }),
        columnHelper.display({
          id: "usage",
          header: "Usage",
          cell: ({ row }) => (
            <div className="whitespace-nowrap text-xs text-slate-500">
              <p>{row.original.product_count} products</p>
              <p>{row.original.customer_count} customers</p>
              <p>{row.original.order_count} orders</p>
            </div>
          ),
        }),
        columnHelper.accessor("billing_required", {
          header: "Billing",
          cell: ({ row }) =>
            row.original.billing_required ? "Required" : "Grandfathered",
        }),
        columnHelper.accessor("created_at", {
          header: "Created",
          cell: ({ row }) => (
            <span className="whitespace-nowrap text-slate-500">
              {createdDateFormatter.format(new Date(row.original.created_at))}
            </span>
          ),
        }),
        columnHelper.display({
          id: "actions",
          header: "Actions",
          cell: ({ row }) => {
            const actionable = ["active", "suspended"].includes(
              row.original.status,
            );
            const blocking = row.original.status === "active";
            return (
              <div className="flex items-center gap-2">
                <Button asChild variant="outline">
                  <Link href={`/platform-admin/tenants/${row.original.id}`}>
                    View
                  </Link>
                </Button>
                {actionable ? (
                  <Button
                    disabled={setStatus.isPending}
                    onClick={() => changeStatus(row.original)}
                    type="button"
                    variant={blocking ? "destructive" : "outline"}
                  >
                    {blocking ? "Block" : "Unblock"}
                  </Button>
                ) : null}
              </div>
            );
          },
        }),
      ]),
    [changeStatus, setStatus.isPending],
  );

  if (tenants.isPending) {
    return <div className="mt-8 h-96 animate-pulse rounded-2xl bg-white" />;
  }
  if (tenants.isError) {
    return (
      <p className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Unable to load tenants. Refresh the page and try again.
      </p>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      {setStatus.isError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Unable to update this tenant. Please try again.
        </p>
      ) : null}
      <DataTable
        columns={columns}
        data={tenants.data}
        emptyMessage="No tenants have joined the platform yet."
        filters={filters}
        getRowId={tenantRowId}
        search={{
          columnId: "tenant",
          placeholder: "Search tenant, subdomain, or owner…",
        }}
      />
    </div>
  );
}

function TenantStatus({ status }: { status: PlatformTenant["status"] }) {
  const colors = {
    provisioning: "bg-amber-50 text-amber-700",
    active: "bg-emerald-50 text-emerald-700",
    suspended: "bg-red-50 text-red-700",
    closed: "bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${colors[status]}`}
    >
      {status}
    </span>
  );
}
