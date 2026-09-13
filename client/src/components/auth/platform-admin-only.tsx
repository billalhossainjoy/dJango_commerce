"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useCurrentUser } from "@/hooks/use-current-user";
import { useAuthStore } from "@/stores/auth-store";

export function PlatformAdminOnly({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const currentUser = useCurrentUser();
  const isPlatformAdmin = Boolean(
    currentUser.data?.account_type === "platform" && currentUser.data.is_staff,
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (currentUser.data && !isPlatformAdmin) {
      router.replace(currentUser.data.tenant ? "/admin" : "/");
    }
  }, [currentUser.data, isPlatformAdmin, router, status]);

  if (status !== "authenticated" || currentUser.isPending) {
    return <PlatformRouteStatus>Checking platform access…</PlatformRouteStatus>;
  }
  if (currentUser.isError) {
    return <PlatformRouteStatus>Unable to verify platform access.</PlatformRouteStatus>;
  }
  if (!isPlatformAdmin) {
    return <PlatformRouteStatus>Redirecting…</PlatformRouteStatus>;
  }

  return children;
}

function PlatformRouteStatus({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6">
      <p className="text-sm text-slate-300" role="status">
        {children}
      </p>
    </main>
  );
}
