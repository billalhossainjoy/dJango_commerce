import type { Metadata } from "next";

import { TenantSettingsForm } from "@/app/admin/settings/tenant-settings-form";

export const metadata: Metadata = { title: "Store settings" };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
        Settings
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        Store settings
      </h1>
      <p className="mb-8 mt-2 text-sm text-slate-500">
        Manage your storefront identity and platform address.
      </p>
      <TenantSettingsForm />
    </div>
  );
}
