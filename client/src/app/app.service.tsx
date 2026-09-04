export type TenantContext = {
  id: string;
  slug: string;
  name: string;
  status: string;
};

export type AuthTokens = {
  access: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type SignupInput = {
  email: string;
  password: string;
  passwordConfirm: string;
};

export type SignupResult = {
  id: string;
  email: string;
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
  private async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(path, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
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
}
