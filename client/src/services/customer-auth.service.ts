import { apiRequest } from "@/lib/api-client";

export type CustomerAuthTokens = { access: string };

export type Customer = {
  id: string;
  email: string;
  account_type: "customer";
  tenant: {
    id: string;
    slug: string;
    name: string;
    status: string;
  };
};

export class CustomerAuthService {
  private basePath(tenantSlug: string) {
    return `/api/v1/tenants/${encodeURIComponent(tenantSlug)}/auth`;
  }

  signup(tenantSlug: string, email: string, password: string) {
    return apiRequest<Customer>(`${this.basePath(tenantSlug)}/signup/`, {
      method: "POST",
      body: { email, password, password_confirmation: password },
    });
  }

  login(tenantSlug: string, email: string, password: string) {
    return apiRequest<CustomerAuthTokens>(`${this.basePath(tenantSlug)}/login/`, {
      method: "POST",
      body: { email, password },
    });
  }

  refresh(tenantSlug: string) {
    return apiRequest<CustomerAuthTokens>(
      `${this.basePath(tenantSlug)}/refresh/`,
      { method: "POST" },
    );
  }

  logout(tenantSlug: string) {
    return apiRequest<void>(`${this.basePath(tenantSlug)}/logout/`, {
      method: "POST",
    });
  }

  current(tenantSlug: string, accessToken: string, signal?: AbortSignal) {
    return apiRequest<Customer>(`${this.basePath(tenantSlug)}/me/`, {
      accessToken,
      signal,
    });
  }
}
