"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DropdownMenu } from "radix-ui";

import { useAuth } from "@/hooks/use-auth";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";

const mobileNavigation = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/customers", label: "Customers" },
];

export function AdminHeader() {
  const { logout } = useAuth();
  const pathname = usePathname();
  const currentUser = useCurrentUser();
  const email = currentUser.data?.email ?? "Account";
  const initial = email.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {currentUser.data?.tenant?.name ?? "Store administration"}
          </p>
          <p className="hidden text-xs text-slate-500 sm:block">
            Manage your storefront
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 sm:block"
          >
            View storefront
          </Link>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pr-3 text-left shadow-sm outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500"
                aria-label="Open admin account menu"
              >
                <span className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-sm font-semibold text-white">
                  {initial}
                </span>
                <span className="hidden max-w-40 truncate text-sm font-medium text-slate-700 md:block">
                  {email}
                </span>
                <svg className="size-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content align="end" sideOffset={8} className="z-50 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10">
                <DropdownMenu.Label className="px-2 py-2">
                  <p className="text-xs text-slate-500">Signed in as</p>
                  <p className="truncate text-sm font-medium text-slate-900">{email}</p>
                </DropdownMenu.Label>
                <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
                <DropdownMenu.Item asChild>
                  <Link href="/admin/settings" className="block cursor-pointer rounded-lg px-2 py-2 text-sm text-slate-700 outline-none hover:bg-slate-100 focus:bg-slate-100">Settings</Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => void logout()} className="cursor-pointer rounded-lg px-2 py-2 text-sm text-red-600 outline-none hover:bg-red-50 focus:bg-red-50">Log out</DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2 md:hidden" aria-label="Admin navigation">
        {mobileNavigation.map((item) => {
          const active = item.href === "/admin"
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-lg px-3 py-2 text-sm font-medium",
                active ? "bg-indigo-50 text-indigo-700" : "text-slate-500",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
