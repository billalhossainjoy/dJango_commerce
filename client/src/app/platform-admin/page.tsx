import type { Metadata } from "next";

import { PlatformOverviewDashboard } from "@/app/platform-admin/overview-dashboard";

export const metadata: Metadata = { title: "Platform overview" };

export default function PlatformAdminPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
        Control center
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        Platform overview
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Monitor tenant growth, subscription health, and platform revenue.
      </p>
      <PlatformOverviewDashboard />
    </div>
  );
}
