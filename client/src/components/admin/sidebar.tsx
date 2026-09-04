"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navigation = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="shrink-0 border-b border-zinc-200 bg-white md:w-64 md:border-r md:border-b-0">
      <div className="px-6 py-5">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
          Tenant workspace
        </p>
        <p className="mt-1 text-lg font-semibold tracking-tight text-zinc-950">
          Store admin
        </p>
      </div>

      <nav
        aria-label="Tenant administration"
        className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-6"
      >
        {navigation.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === item.href
              : pathname.startsWith(`${item.href}/`) || pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
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
  );
}
