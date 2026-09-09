"use client";

import Link from "next/link";
import { DropdownMenu } from "radix-ui";

import { useCart } from "@/app/(site)/cart/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { useCurrentCustomer } from "@/hooks/use-current-customer";
import { useTenantQuery } from "@/hooks/use-tenant-query";

export function Header({ tenantSlug }: { tenantSlug: string | null }) {
  const platformAuth = useAuth();
  const customerAuth = useCustomerAuth(tenantSlug ?? "");
  const customer = useCurrentCustomer(tenantSlug ?? "");
  const tenant = useTenantQuery(tenantSlug);
  const isTenant = tenantSlug !== null;
  const cart = useCart(tenantSlug ?? "");
  const status = isTenant ? customerAuth.status : platformAuth.status;
  const email = customer.data?.email;
  const logout = isTenant ? customerAuth.logout : platformAuth.logout;

  return (
    <header className="border-b border-zinc-200 bg-white text-zinc-950">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link className="text-lg font-semibold tracking-tight" href="/">
          {isTenant ? tenant.data?.name ?? tenantSlug : "E-commerce"}
        </Link>

        <nav className="flex items-center gap-4" aria-label="Account navigation">
          {isTenant ? (
            <Link
              href="/cart"
              aria-label={`Shopping cart with ${cart.data?.item_count ?? 0} items`}
              className="relative flex items-center gap-2 text-sm font-medium text-zinc-700 transition hover:text-zinc-950"
            >
              <svg
                aria-hidden="true"
                className="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="20" r="1" />
                <circle cx="19" cy="20" r="1" />
                <path d="M3 4h2l2.4 10.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 8H6" />
              </svg>
              <span className="hidden sm:inline">Cart</span>
              {(cart.data?.item_count ?? 0) > 0 ? (
                <span className="absolute -right-2.5 -top-2.5 grid min-w-5 place-items-center rounded-full bg-indigo-600 px-1 text-[11px] font-semibold leading-5 text-white sm:static sm:min-w-0 sm:bg-transparent sm:p-0 sm:text-sm sm:leading-normal sm:text-zinc-700">
                  {cart.data?.item_count}
                </span>
              ) : null}
            </Link>
          ) : null}
          {status === "authenticated" ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  className="flex size-10 items-center justify-center rounded-full bg-zinc-950 text-sm font-semibold text-white outline-none transition hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2"
                  type="button"
                  aria-label="Open account menu"
                >
                  {isTenant && email ? (
                    email.charAt(0).toUpperCase()
                  ) : (
                    <svg
                      aria-hidden="true"
                      className="size-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.1a7.5 7.5 0 0 1 15 0 17.9 17.9 0 0 1-7.5 1.65A17.9 17.9 0 0 1 4.5 20.1Z"
                      />
                    </svg>
                  )}
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={8}
                  className="z-50 min-w-52 rounded-xl border border-zinc-200 bg-white p-1.5 text-zinc-950 shadow-lg"
                >
                  <DropdownMenu.Label className="px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    {email ?? "My account"}
                  </DropdownMenu.Label>
                  <DropdownMenu.Separator className="my-1 h-px bg-zinc-200" />
                  <DropdownMenu.Item asChild>
                    <Link
                      className="flex cursor-pointer rounded-lg px-2 py-2 text-sm outline-none hover:bg-zinc-100 focus:bg-zinc-100"
                      href={isTenant ? "/account" : "/admin"}
                    >
                      {isTenant ? "Account" : "Store dashboard"}
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className="cursor-pointer rounded-lg px-2 py-2 text-sm text-red-600 outline-none hover:bg-red-50 focus:bg-red-50"
                    onSelect={() => void logout()}
                  >
                    Log out
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : status === "unauthenticated" ? (
            <>
              <Link
                className="text-sm font-medium text-zinc-700 transition hover:text-zinc-950"
                href="/login"
              >
                Log in
              </Link>
              <Link
                className="rounded-lg bg-zinc-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
                href="/signup"
              >
                {isTenant ? "Create account" : "Start selling"}
              </Link>
            </>
          ) : (
            <span className="text-sm text-zinc-500">Checking session…</span>
          )}
        </nav>
      </div>
    </header>
  );
}
