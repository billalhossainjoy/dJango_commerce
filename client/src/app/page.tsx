import { headers } from "next/headers";

import { MarketingPage } from "@/components/marketing-page";
import { Storefront } from "@/components/storefront";

type HostRoute =
  | { kind: "platform" }
  | { kind: "tenant"; tenantSlug: string }
  | { kind: "unknown" };

function classifyHostname(value: string): HostRoute {
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
  if (!hostname.endsWith(suffix)) {
    return { kind: "unknown" };
  }

  const tenantSlug = hostname.slice(0, -suffix.length);
  if (!tenantSlug || tenantSlug.includes(".")) {
    return { kind: "unknown" };
  }

  return { kind: "tenant", tenantSlug };
}

export default async function Home() {
  const hostname = (await headers()).get("host");
  const route: HostRoute = hostname
    ? classifyHostname(hostname)
    : { kind: "platform" };

  if (route.kind === "platform") {
    return <MarketingPage />;
  }

  return (
    <Storefront tenantSlug={route.kind === "tenant" ? route.tenantSlug : null} />
  );
}
