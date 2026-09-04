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

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly details: unknown,
  ) {
    super(`Django returned status ${status}.`);
  }
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError) || !error.details) {
    return fallback;
  }

  if (typeof error.details === "object" && "detail" in error.details) {
    const detail = error.details.detail;
    if (typeof detail === "string") return detail;
  }

  if (typeof error.details === "object") {
    const firstError = Object.values(error.details).flat()[0];
    if (typeof firstError === "string") return firstError;
  }

  return fallback;
}

export class AppService {
  async getCurrentUser(
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<CurrentUser> {
    const response = await fetch("/api/v1/auth/me/", {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      signal,
    });

    if (!response.ok) {
      const details = await response.json().catch(() => null);
      throw new ApiError(response.status, details);
    }

    return (await response.json()) as CurrentUser;
  }

  private async post<T>(
    path: string,
    body: unknown,
    accessToken?: string,
  ): Promise<T> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(path, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const details = await response.json().catch(() => null);
      throw new ApiError(response.status, details);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  async getTenantContext(
    tenantSlug: string,
    signal?: AbortSignal,
  ): Promise<TenantContext | null> {
    const encodedSlug = encodeURIComponent(tenantSlug);
    const response = await fetch(
      `/api/v1/tenants/${encodedSlug}/`,
      {
        headers: { Accept: "application/json" },
        signal,
      },
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const details = await response.json().catch(() => null);
      throw new ApiError(response.status, details);
    }

    return (await response.json()) as TenantContext;
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
