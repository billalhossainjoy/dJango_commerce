export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly details: unknown,
  ) {
    super(`API returned status ${status}.`);
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

type ApiRequestOptions = Omit<RequestInit, "body" | "headers"> & {
  accessToken?: string;
  body?: unknown;
  headers?: HeadersInit;
};

export async function apiRequest<T>(
  path: string,
  { accessToken, body, headers: initialHeaders, ...options }: ApiRequestOptions = {},
): Promise<T> {
  const headers = new Headers(initialHeaders);
  headers.set("Accept", "application/json");

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: options.credentials ?? "include",
    body: body === undefined ? undefined : JSON.stringify(body),
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
