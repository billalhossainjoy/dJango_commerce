import type { ReactNode } from "react";

import { Header } from "@/components/header";
import { StorefrontFooter } from "@/components/storefront-footer";
import { getHostRoute } from "@/lib/host-route";
import { CustomerAuthSession } from "@/providers/customer-auth-session";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const route = await getHostRoute();
  const tenantSlug = route.kind === "tenant" ? route.tenantSlug : null;

  return (
    <>
      {tenantSlug ? <CustomerAuthSession tenantSlug={tenantSlug} /> : null}
      <Header tenantSlug={tenantSlug} />
      <main className="flex flex-1 flex-col">{children}</main>
      {tenantSlug ? <StorefrontFooter tenantSlug={tenantSlug} /> : null}
    </>
  );
}
