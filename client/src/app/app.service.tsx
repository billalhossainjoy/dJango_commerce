import { ApiError, apiRequest } from "@/lib/api-client";

export type TenantContext = {
  id: string;
  slug: string;
  name: string;
  status: string;
};

export type AuthTokens = {
  access: string;
};

export type CurrentUser = {
  id: string;
  email: string;
  account_type: "platform" | "customer";
  tenant: TenantContext | null;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type SignupInput = {
  email: string;
  password: string;
  passwordConfirm: string;
  storeName: string;
  slug: string;
};

export type SignupResult = {
  id: string;
  email: string;
  tenant: TenantContext;
};

export class AppService {
  async getCurrentUser(
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<CurrentUser> {
    return apiRequest<CurrentUser>("/api/v1/auth/me/", {
      accessToken,
      signal,
    });
  }

  private async post<T>(
    path: string,
    body: unknown,
    accessToken?: string,
  ): Promise<T> {
    return apiRequest<T>(path, {
      method: "POST",
      accessToken,
      body,
    });
  }

  async getTenantContext(
    tenantSlug: string,
    signal?: AbortSignal,
  ): Promise<TenantContext | null> {
    const encodedSlug = encodeURIComponent(tenantSlug);
    try {
      return await apiRequest<TenantContext>(
        `/api/v1/tenants/${encodedSlug}/`,
        { signal },
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }

  signup(input: SignupInput): Promise<SignupResult> {
    return this.post<SignupResult>("/api/v1/auth/signup/", {
      email: input.email,
      password: input.password,
      store_name: input.storeName,
      slug: input.slug,
    });
  }

  login(input: LoginInput): Promise<AuthTokens> {
    return this.post<AuthTokens>("/api/v1/auth/login/", input);
  }

  refresh(): Promise<{ access: string }> {
    return this.post<{ access: string }>("/api/v1/auth/token/refresh/", {});
  }

  logout(): Promise<void> {
    return this.post<void>("/api/v1/auth/logout/", {});
  }

  activateTenant(
    tenantSlug: string,
    accessToken: string,
  ): Promise<TenantContext> {
    const encodedSlug = encodeURIComponent(tenantSlug);
    return this.post<TenantContext>(
      `/api/v1/tenants/${encodedSlug}/activate/`,
      {},
      accessToken,
    );
  }

}
