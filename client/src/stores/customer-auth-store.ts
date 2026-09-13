import { create } from "zustand";

import type { AuthStatus } from "@/stores/auth-store";

type CustomerAuthStore = {
  accessToken: string | null;
  tenantSlug: string | null;
  status: AuthStatus;
  setAuthenticated: (tenantSlug: string, accessToken: string) => void;
  setUnauthenticated: (tenantSlug: string | null) => void;
};

export function customerSessionQueryKey(tenantSlug: string) {
  return ["customer-auth", tenantSlug, "session"] as const;
}

export const useCustomerAuthStore = create<CustomerAuthStore>()((set) => ({
  accessToken: null,
  tenantSlug: null,
  status: "loading",
  setAuthenticated: (tenantSlug, accessToken) =>
    set({ accessToken, tenantSlug, status: "authenticated" }),
  setUnauthenticated: (tenantSlug) =>
    set({ accessToken: null, tenantSlug, status: "unauthenticated" }),
}));
