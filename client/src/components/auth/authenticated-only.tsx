"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuthStore } from "@/stores/auth-store";

export function AuthenticatedOnly({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [router, status]);

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

  return children;
}
