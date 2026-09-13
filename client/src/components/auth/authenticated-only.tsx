"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useSubscription } from "@/app/admin/billing/use-billing";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAuthStore } from "@/stores/auth-store";

export function AuthenticatedOnly({
  tenantSlug,
  children,
}: {
  tenantSlug: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const currentUser = useCurrentUser();
  const ownerTenant = currentUser.data?.tenant;
  const shouldCheckBilling = Boolean(
    tenantSlug &&
      ownerTenant?.status === "provisioning" &&
      !pathname.startsWith("/admin/billing"),
  );
  const subscription = useSubscription(false, shouldCheckBilling);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    if (status !== "authenticated" || !currentUser.data) return;

    if (tenantSlug && ownerTenant?.slug !== tenantSlug) {
      const hostname =
        ownerTenant?.canonical_hostname ??
        process.env.NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN;
      if (hostname) redirectToHostname(hostname, "/admin");
      return;
    }

    if (!tenantSlug && ownerTenant?.canonical_hostname) {
      redirectToHostname(ownerTenant.canonical_hostname, pathname);
      return;
    }

    if (
      shouldCheckBilling &&
      subscription.data &&
      !subscription.data.has_access
    ) {
      router.replace("/admin/billing?subscription=required");
    }
  }, [
    currentUser.data,
    ownerTenant,
    pathname,
    router,
    shouldCheckBilling,
    status,
    subscription.data,
    tenantSlug,
  ]);

  if (status !== "authenticated") {
    return (
      <main className="flex flex-1 items-center justify-center bg-zinc-50 px-6">
        <p className="text-sm text-zinc-600" role="status">
          {status === "unauthenticated"
            ? "Redirecting to login…"
            : "Checking your session…"}
        </p>
      </main>
    );
  }

  if (currentUser.isPending) {
    return <AdminRouteStatus>Loading your store…</AdminRouteStatus>;
  }

  if (currentUser.isError) {
    return <AdminRouteStatus>Unable to verify store access.</AdminRouteStatus>;
  }

  if (tenantSlug && ownerTenant?.slug !== tenantSlug) {
    return <AdminRouteStatus>Redirecting to your store…</AdminRouteStatus>;
  }

  if (!tenantSlug && ownerTenant) {
    return ownerTenant.canonical_hostname ? (
      <AdminRouteStatus>Redirecting to your store…</AdminRouteStatus>
    ) : (
      <AdminRouteStatus>Store hostname is not configured.</AdminRouteStatus>
    );
  }

  if (shouldCheckBilling && subscription.isPending) {
    return <AdminRouteStatus>Checking your subscription…</AdminRouteStatus>;
  }

  if (shouldCheckBilling && subscription.data && !subscription.data.has_access) {
    return <AdminRouteStatus>Redirecting to billing…</AdminRouteStatus>;
  }

  return children;
}

function redirectToHostname(hostname: string, pathname: string) {
  const url = new URL(window.location.href);
  url.hostname = hostname;
  url.pathname = pathname;
  url.search = "";
  url.hash = "";
  window.location.replace(url);
}

function AdminRouteStatus({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-6">
      <p className="text-sm text-zinc-600" role="status">
        {children}
      </p>
    </main>
  );
}
