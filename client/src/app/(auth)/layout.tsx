import Link from "next/link";

import { GuestOnly } from "@/components/auth/guest-only";
import { CustomerGuestOnly } from "@/components/auth/customer-guest-only";
import { getHostRoute } from "@/lib/host-route";
import { CustomerAuthSession } from "@/providers/customer-auth-session";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const route = await getHostRoute();
  const tenantSlug = route.kind === "tenant" ? route.tenantSlug : null;

  return (
    <main className="auth-theme flex flex-1 items-center justify-center bg-background px-4 py-12 text-foreground sm:px-6">
      <section className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
        <Link className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground" href="/">
          E-commerce
        </Link>
        {tenantSlug ? <CustomerAuthSession tenantSlug={tenantSlug} /> : null}
        {route.kind === "unknown" ? (
          <p className="mt-6 text-sm text-destructive">Store unavailable.</p>
        ) : tenantSlug ? (
          <CustomerGuestOnly tenantSlug={tenantSlug}>{children}</CustomerGuestOnly>
        ) : (
          <GuestOnly>{children}</GuestOnly>
        )}
      </section>
    </main>
  );
}
