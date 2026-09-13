import type { ReactNode } from "react";

import { PlatformAdminHeader } from "@/components/platform-admin/header";
import { PlatformAdminSidebar } from "@/components/platform-admin/sidebar";
import { PlatformAdminOnly } from "@/components/auth/platform-admin-only";
import { getHostRoute } from "@/lib/host-route";

export default async function PlatformAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const route = await getHostRoute();

  if (route.kind !== "platform") {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-6">
        <p className="text-sm text-red-300">Platform administration is unavailable on this domain.</p>
      </main>
    );
  }

  return (
    <PlatformAdminOnly>
      <div className="admin-theme flex min-h-screen bg-slate-100 text-slate-950">
        <PlatformAdminSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <PlatformAdminHeader />
          <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
            {children}
          </main>
        </div>
      </div>
    </PlatformAdminOnly>
  );
}
