import { create } from "zustand";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthStore = {
  accessToken: string | null;
  status: AuthStatus;
  setAuthenticated: (accessToken: string) => void;
  setUnauthenticated: () => void;
};

export const authSessionQueryKey = ["auth", "session"] as const;

export const useAuthStore = create<AuthStore>()((set) => ({
  accessToken: null,
  status: "loading",
  setAuthenticated: (accessToken) =>
    set({ accessToken, status: "authenticated" }),
  setUnauthenticated: () =>
    set({ accessToken: null, status: "unauthenticated" }),
}));
