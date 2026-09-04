import type { ReactNode } from "react";

import { AdminHeader } from "@/components/admin/header";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AuthenticatedOnly } from "@/components/auth/authenticated-only";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthenticatedOnly>
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
