import { MarketingPage } from "@/components/marketing-page";
import { Storefront } from "@/components/storefront";
import { getHostRoute } from "@/lib/host-route";

export default async function Home() {
  const route = await getHostRoute();

  if (route.kind === "platform") {
    return <MarketingPage />;
  }

  return (
    <Storefront tenantSlug={route.kind === "tenant" ? route.tenantSlug : null} />
  );
}
