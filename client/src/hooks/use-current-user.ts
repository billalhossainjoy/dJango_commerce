"use client";

import { useQuery } from "@tanstack/react-query";

import { AppService } from "@/app/app.service";
import { useAuthStore } from "@/stores/auth-store";

const appService = new AppService();

export const currentUserQueryKey = ["auth", "current-user"] as const;

export function useCurrentUser() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: currentUserQueryKey,
    queryFn: ({ signal }) => appService.getCurrentUser(accessToken!, signal),
    enabled: accessToken !== null,
  });
}
