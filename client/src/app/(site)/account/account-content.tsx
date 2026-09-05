"use client";

import { Button } from "@/components/ui/button";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { useCurrentCustomer } from "@/hooks/use-current-customer";

export function AccountContent({ tenantSlug }: { tenantSlug: string }) {
  const auth = useCustomerAuth(tenantSlug);
  const customer = useCurrentCustomer(tenantSlug);

  if (customer.isPending) {
    return <p role="status" className="text-sm text-muted-foreground">Loading your account…</p>;
  }
  if (customer.isError) {
    return <p role="alert" className="text-sm text-destructive">Unable to load your account.</p>;
  }

  return (
    <div className="grid gap-6 items-start lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <section className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profile</p>
        <h2 className="mt-3 break-words text-lg font-semibold text-foreground">{customer.data.email}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Customer account</p>
        <Button className="mt-6 h-10 bg-card px-4 text-sm text-card-foreground dark:bg-card" variant="outline" onClick={() => void auth.logout()}>
          Log out
        </Button>
      </section>
      <section className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm p-6">
        <h2 className="text-lg font-semibold text-foreground">Orders</h2>
        <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/50 px-6 py-10 text-center">
          <p className="text-sm font-medium text-foreground">No orders to show yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Your order history will appear here.</p>
        </div>
      </section>
    </div>
  );
}
