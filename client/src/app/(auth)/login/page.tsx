import type { Metadata } from "next";

import { LoginForm } from "@/app/(auth)/login/login-form";
import { TenantLogin } from "@/app/(auth)/login/tenant-login";
import { GuestOnly } from "@/components/auth/guest-only";
import { getHostRoute } from "@/lib/host-route";

export const metadata: Metadata = {
  title: "Log in",
};

export default async function LoginPage() {
  const route = await getHostRoute();
  const tenantSlug = route.kind === "tenant" ? route.tenantSlug : null;

  if (tenantSlug) {
    return <TenantLogin tenantSlug={tenantSlug} />;
  }

  return (
    <GuestOnly>
      <h1 className="mt-4 text-2xl font-semibold">
        Store owner login
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter your details to continue.
      </p>
      <LoginForm tenantSlug={null} />
    </GuestOnly>
  );
}
