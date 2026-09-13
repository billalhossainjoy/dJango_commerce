"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useCustomerAuth } from "@/hooks/use-customer-auth";

export function CustomerGuestOnly({
  tenantSlug,
  children,
}: {
  tenantSlug: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { status } = useCustomerAuth(tenantSlug);

  useEffect(() => {
    if (status === "authenticated") router.replace("/account");
  }, [router, status]);

  if (status !== "unauthenticated") {
    return (
      <p className="text-sm text-zinc-600" role="status">
        {status === "authenticated"
          ? "Redirecting to your account…"
          : "Checking your session…"}
      </p>
    );
  }

  return children;
}
