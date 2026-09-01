export type TenantContext = {
  id: string;
  slug: string;
  name: string;
  status: string;
};

export class AppService {
  getPublicApiUrl(): string {
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  if (!publicApiUrl) {
    throw new Error("The public Django API is not configured.");
  }

  return publicApiUrl;
}

async getTenantContext(
  tenantSlug: string,
  signal?: AbortSignal,
): Promise<TenantContext | null> {
  const encodedSlug = encodeURIComponent(tenantSlug);
  const response = await fetch(
    new URL(`/api/v1/tenants/${encodedSlug}/`, this.getPublicApiUrl()),
    {
      headers: { Accept: "application/json" },
      signal,
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Django returned status ${response.status}.`);
  }

  return (await response.json()) as TenantContext;
}
}
