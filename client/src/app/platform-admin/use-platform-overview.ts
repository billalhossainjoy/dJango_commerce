"use client";

import { useQuery } from "@tanstack/react-query";

import { getPlatformOverview } from "@/app/platform-admin/platform-admin.service";
import { useAuthStore } from "@/stores/auth-store";

export function usePlatformOverview() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ["platform-admin", "overview"],
    queryFn: ({ signal }) => getPlatformOverview(accessToken!, signal),
    enabled: Boolean(accessToken),
  });
}
