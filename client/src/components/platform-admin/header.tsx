"use client";

import Link from "next/link";

import { platformAdminNavigation } from "@/components/platform-admin/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentUser } from "@/hooks/use-current-user";

export function PlatformAdminHeader() {
  const { logout } = useAuth();
  const currentUser = useCurrentUser();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
        <div>
          <p className="text-sm font-semibold text-slate-950">
            Platform administration
          </p>
          <p className="hidden text-xs text-slate-500 sm:block">
            Tenants, subscriptions, and payments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden max-w-56 truncate text-sm text-slate-600 sm:block">
            {currentUser.data?.email}
          </span>
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => void logout()}
          >
            Log out
          </button>
        </div>
      </div>
      <nav
        aria-label="Platform administration"
        className="flex gap-1 border-t border-slate-100 px-3 py-2 md:hidden"
      >
        {platformAdminNavigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-800"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
