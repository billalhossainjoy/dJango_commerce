import { notFound } from "next/navigation";

import { CheckoutForm } from "@/app/(site)/checkout/checkout-form";
import { getHostRoute } from "@/lib/host-route";

export default async function CheckoutPage() {
  const route = await getHostRoute();

  if (route.kind !== "tenant") notFound();

  return <CheckoutForm tenantSlug={route.tenantSlug} />;
}
