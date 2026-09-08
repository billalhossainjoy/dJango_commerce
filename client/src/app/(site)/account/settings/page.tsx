"use client";

import { useAccountTenantSlug } from "@/app/(site)/account/account-shell";
import { Button } from "@/components/ui/button";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { useCurrentCustomer } from "@/hooks/use-current-customer";

export default function CustomerSettingsPage() {
  const tenantSlug = useAccountTenantSlug();
  const auth = useCustomerAuth(tenantSlug);
  const customer = useCurrentCustomer(tenantSlug);

  if (customer.isPending) {
    return <p className="text-sm text-zinc-600">Loading settings…</p>;
  }

  if (customer.isError) {
    return <p className="text-sm text-red-600">Unable to load settings.</p>;
  }

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-700">
        Settings
      </p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
        Account settings
      </h2>
      <p className="mt-2 text-zinc-600">
        Review your customer identity and manage this session.
      </p>

      <section className="mt-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-6 py-5">
          <h3 className="font-semibold text-zinc-950">Profile</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Your account details for this storefront.
          </p>
        </div>
        <dl className="divide-y divide-zinc-100 px-6">
          <div className="grid gap-1 py-5 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-6">
            <dt className="text-sm font-medium text-zinc-500">Email address</dt>
            <dd className="break-words text-sm font-medium text-zinc-950">
              {customer.data.email}
            </dd>
          </div>
          <div className="grid gap-1 py-5 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-6">
            <dt className="text-sm font-medium text-zinc-500">Store</dt>
            <dd className="text-sm font-medium text-zinc-950">
              {customer.data.tenant.name}
            </dd>
          </div>
          <div className="grid gap-1 py-5 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-6">
            <dt className="text-sm font-medium text-zinc-500">Account type</dt>
            <dd className="text-sm font-medium capitalize text-zinc-950">
              {customer.data.account_type}
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="font-semibold text-zinc-950">Session</h3>
        <p className="mt-1 text-sm text-zinc-600">
          Sign out of your customer account on this device.
        </p>
        <Button
          variant="outline"
          className="mt-5 h-10 border-red-200 px-4 text-red-700 hover:bg-red-50 hover:text-red-800"
          onClick={() => void auth.logout()}
        >
          Log out
        </Button>
      </section>
    </div>
  );
}
