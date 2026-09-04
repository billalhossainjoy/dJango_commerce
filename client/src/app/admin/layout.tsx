import type { ReactNode } from "react";

import { AdminSidebar } from "@/components/admin/sidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-50 md:flex-row">
      <AdminSidebar />
      <div className="min-w-0 flex-1 p-6 md:p-10">{children}</div>
    </div>
  );
}
