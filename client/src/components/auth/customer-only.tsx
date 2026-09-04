"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useCustomerAuth } from "@/hooks/use-customer-auth";

export function CustomerOnly({
  tenantSlug,
  children,
}: {
  tenantSlug: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { status } = useCustomerAuth(tenantSlug);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?next=/account");
    }
  }, [router, status]);

  if (status !== "authenticated") {
    return (
      <p className="text-sm text-zinc-600" role="status">
        {status === "loading" ? "Checking your session…" : "Redirecting to login…"}
      </p>
    );
  }

  return children;
}
