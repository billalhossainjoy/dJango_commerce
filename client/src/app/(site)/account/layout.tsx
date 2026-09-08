import type { ReactNode } from "react";

import { AccountShell } from "@/app/(site)/account/account-shell";
import { CustomerOnly } from "@/components/auth/customer-only";
import { getHostRoute } from "@/lib/host-route";

export default async function AccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  const route = await getHostRoute();

  if (route.kind !== "tenant") {
    return (
      <div className="account-theme flex flex-1 bg-background px-6 py-20 text-foreground">
        <div className="mx-auto w-full max-w-6xl">
          <h1 className="text-3xl font-semibold">Customer account unavailable</h1>
          <p className="mt-2 text-muted-foreground">
            Open this page from a tenant storefront.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="account-theme flex flex-1 flex-col bg-background text-foreground">
      <CustomerOnly tenantSlug={route.tenantSlug}>
        <AccountShell tenantSlug={route.tenantSlug}>{children}</AccountShell>
      </CustomerOnly>
    </div>
  );
}
