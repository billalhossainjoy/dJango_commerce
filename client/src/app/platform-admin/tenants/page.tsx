import type { Metadata } from "next";

import { PlatformTenantList } from "@/app/platform-admin/tenants/tenant-list";

export const metadata: Metadata = { title: "Platform tenants" };

export default function PlatformTenantsPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
        Platform stores
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        Tenants
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Review tenant ownership, activity, subscription health, and usage.
      </p>
      <PlatformTenantList />
    </div>
  );
}
