import { headers } from "next/headers";
import { Storefront } from "@/components/storefront";

function getTenantSlugFromHostname(value: string): string | null {
  const rootDomain = process.env.NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN;
  const hostname = value.toLowerCase().split(":", 1)[0].replace(/\.$/, "");

  if (!rootDomain) {
    throw new Error("The platform root domain is not configured.");
  }

  const suffix = `.${rootDomain.toLowerCase()}`;
  if (!hostname.endsWith(suffix)) {
    return null;
  }

  const tenantSlug = hostname.slice(0, -suffix.length);
  if (!tenantSlug || tenantSlug.includes(".")) {
    return null;
  }

  return tenantSlug;
}

export default async function Home() {
  const publicHostname = (await headers()).get("host");
  console.log("publicHostname", publicHostname);  
  const tenantSlug = publicHostname
    ? getTenantSlugFromHostname(publicHostname)
    : null;

  return <Storefront tenantSlug={tenantSlug} />;
}
