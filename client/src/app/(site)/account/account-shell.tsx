"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext } from "react";

import { useCurrentCustomer } from "@/hooks/use-current-customer";
import { cn } from "@/lib/utils";

const AccountTenantContext = createContext<string | null>(null);

const accountNavigation = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/settings", label: "Settings" },
] as const;

export function useAccountTenantSlug() {
  const tenantSlug = useContext(AccountTenantContext);
  if (!tenantSlug) throw new Error("Account tenant context is unavailable.");
  return tenantSlug;
}

export function AccountShell({
  tenantSlug,
  children,
}: {
  tenantSlug: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const customer = useCurrentCustomer(tenantSlug);
  const email = customer.data?.email;

  return (
    <AccountTenantContext.Provider value={tenantSlug}>
      <div className="mx-auto w-full max-w-7xl px-6 py-10 sm:py-14">
        <div className="flex items-center gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-full bg-zinc-950 text-lg font-semibold text-white">
            {email?.charAt(0).toUpperCase() ?? "A"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-500">My account</p>
            <h1 className="truncate text-2xl font-semibold tracking-tight text-zinc-950">
              {email ?? "Customer account"}
            </h1>
          </div>
        </div>

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm">
            <nav
              aria-label="Customer account"
              className="flex gap-2 overflow-x-auto lg:flex-col"
            >
              {accountNavigation.map((item) => {
                const isActive =
                  item.href === "/account"
                    ? pathname === item.href
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "shrink-0 rounded-xl px-4 py-3 text-sm font-medium transition",
                      isActive
                        ? "bg-zinc-950 text-white"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </AccountTenantContext.Provider>
  );
}
