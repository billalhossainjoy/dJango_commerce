"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuthStore } from "@/stores/auth-store";

export function GuestOnly({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/admin");
    }
  }, [router, status]);

  if (status !== "unauthenticated") {
    return (
      <p className="text-sm text-zinc-600" role="status">
        {status === "authenticated"
          ? "Redirecting to your dashboard…"
          : "Checking your session…"}
      </p>
    );
  }

  return children;
}
