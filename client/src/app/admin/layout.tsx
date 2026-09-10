import type { ReactNode } from "react";

import { AdminHeader } from "@/components/admin/header";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AuthenticatedOnly } from "@/components/auth/authenticated-only";
import { getHostRoute } from "@/lib/host-route";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const route = await getHostRoute();

  if (route.kind === "unknown") {
    return (
      <main className="flex flex-1 items-center justify-center bg-zinc-50 px-6">
        <p className="text-sm text-red-600" role="alert">
          Store unavailable.
        </p>
      </main>
    );
  }

  return (
    <AuthenticatedOnly
      tenantSlug={route.kind === "tenant" ? route.tenantSlug : null}
    >
      <div className="admin-theme flex min-h-screen bg-[#f6f7fb] text-slate-950">
        <AdminSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminHeader />
          <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
            {children}
          </main>
        </div>
      </div>
    </AuthenticatedOnly>
  );
}
