"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { AppService, type AuthTokens } from "@/app/app.service";
import { authSessionQueryKey, useAuthStore } from "@/stores/auth-store";

const appService = new AppService();

export function AuthSession() {
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const setUnauthenticated = useAuthStore((state) => state.setUnauthenticated);
  const session = useQuery<AuthTokens | null>({
    queryKey: authSessionQueryKey,
    queryFn: () => appService.refresh(),
    retry: false,
    staleTime: Infinity,
    refetchInterval: 10 * 60 * 1_000,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (session.data?.access) {
      setAuthenticated(session.data.access);
    } else if (session.isError || session.data === null) {
      setUnauthenticated();
    }
  }, [session.data, session.isError, setAuthenticated, setUnauthenticated]);

  return null;
}
