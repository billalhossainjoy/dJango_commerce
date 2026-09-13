import { headers } from "next/headers";

export type HostRoute =
  | { kind: "platform" }
  | { kind: "tenant"; tenantSlug: string }
  | { kind: "unknown" };

export function classifyHostname(value: string): HostRoute {
  const rootDomain = process.env.NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN;
  if (!rootDomain) {
    throw new Error("The platform root domain is not configured.");
  }

  const hostname = value.toLowerCase().split(":", 1)[0].replace(/\.$/, "");
  const normalizedRootDomain = rootDomain.toLowerCase().replace(/\.$/, "");

  if (
    hostname === normalizedRootDomain ||
    hostname === `www.${normalizedRootDomain}`
  ) {
    return { kind: "platform" };
  }

  const suffix = `.${normalizedRootDomain}`;
  if (!hostname.endsWith(suffix)) return { kind: "unknown" };

  const tenantSlug = hostname.slice(0, -suffix.length);
  if (!tenantSlug || tenantSlug.includes(".")) return { kind: "unknown" };

  return { kind: "tenant", tenantSlug };
}

export async function getHostRoute(): Promise<HostRoute> {
  const hostname = (await headers()).get("host");
  return hostname ? classifyHostname(hostname) : { kind: "platform" };
}
