"use client";

import Link from "next/link";

import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { useTenantQuery } from "@/hooks/use-tenant-query";

export function StorefrontFooter({ tenantSlug }: { tenantSlug: string }) {
  const tenant = useTenantQuery(tenantSlug);
  const auth = useCustomerAuth(tenantSlug);

  if (!tenant.data) return null;

  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 text-zinc-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Link href="/" className="text-xl font-semibold text-white">
            {tenant.data.name}
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-400">
            Discover products selected and managed directly by our store.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-white">Shop</h2>
          <nav className="mt-4 flex flex-col items-start gap-3 text-sm">
            <Link href="/" className="transition hover:text-white">
              Home
            </Link>
            <Link href="/#products" className="transition hover:text-white">
              All products
            </Link>
          </nav>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-white">Account</h2>
          <nav className="mt-4 flex flex-col items-start gap-3 text-sm">
            {auth.status === "authenticated" ? (
              <Link href="/account" className="transition hover:text-white">
                My account
              </Link>
            ) : auth.status === "unauthenticated" ? (
              <>
                <Link href="/login" className="transition hover:text-white">
                  Log in
                </Link>
                <Link href="/signup" className="transition hover:text-white">
                  Create account
                </Link>
              </>
            ) : (
              <span className="text-zinc-500">Checking session…</span>
            )}
          </nav>
        </div>
      </div>
      <div className="border-t border-zinc-800">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-5 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {tenant.data.name}</p>
          <p>Powered by E-commerce</p>
        </div>
      </div>
    </footer>
  );
}
