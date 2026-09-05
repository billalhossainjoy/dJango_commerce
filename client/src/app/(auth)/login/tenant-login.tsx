"use client";

import { LoginForm } from "@/app/(auth)/login/login-form";
import { useTenantLoginContext } from "@/hooks/use-tenant-login-context";

export function TenantLogin({ tenantSlug }: { tenantSlug: string }) {
  const context = useTenantLoginContext(tenantSlug);

  if (context.isPending) {
    return (
      <p className="mt-6 text-sm text-muted-foreground" role="status">
        Loading store…
      </p>
    );
  }

  if (context.isError) {
    return (
      <p className="mt-6 text-sm text-destructive" role="alert">
        Unable to load this store. Please try again.
      </p>
    );
  }

  if (!context.data) {
    return (
      <p className="mt-6 text-sm text-destructive" role="alert">
        Store unavailable.
      </p>
    );
  }

  return (
    <>
      <h1 className="mt-4 text-2xl font-semibold">
        Sign in to {context.data.name}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Continue as a customer or store owner.
      </p>
      <LoginForm tenantSlug={tenantSlug} />
    </>
  );
}
