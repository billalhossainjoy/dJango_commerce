"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  AppService,
  type AuthTokens,
  type LoginInput,
  type SignupInput,
} from "@/app/app.service";
import { authSessionQueryKey, useAuthStore } from "@/stores/auth-store";

const appService = new AppService();

export function useAuth() {
  const queryClient = useQueryClient();
  const { accessToken, status, setAuthenticated, setUnauthenticated } =
    useAuthStore();
  const signup = useMutation({
    mutationFn: (input: SignupInput) => appService.signup(input),
  });
  const login = useMutation({
    mutationFn: (input: LoginInput) => appService.login(input),
    onSuccess: ({ access }) => {
      queryClient.setQueryData<AuthTokens>(authSessionQueryKey, { access });
      setAuthenticated(access);
    },
  });
  const logout = useMutation({
    mutationFn: () => appService.logout(),
    onSettled: () => {
      queryClient.setQueryData<AuthTokens | null>(authSessionQueryKey, null);
      setUnauthenticated();
    },
  });

  return {
    accessToken,
    status,
    signup: signup.mutateAsync,
    login: login.mutateAsync,
    logout: () => logout.mutateAsync().catch(() => undefined),
  };
}
