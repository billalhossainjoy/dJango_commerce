"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useCurrentUser } from "@/hooks/use-current-user";
import { useAuthStore } from "@/stores/auth-store";

export function GuestOnly({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const currentUser = useCurrentUser();

  useEffect(() => {
    if (status === "authenticated" && currentUser.data) {
      router.replace(currentUser.data.is_staff ? "/platform-admin" : "/admin");
    }
  }, [currentUser.data, router, status]);

  if (status !== "unauthenticated") {
    return (
      <p className="text-sm text-zinc-600" role="status">
        {status === "authenticated" && currentUser.data
          ? "Redirecting to your dashboard…"
          : "Checking your session…"}
      </p>
    );
  }

  return children;
}
