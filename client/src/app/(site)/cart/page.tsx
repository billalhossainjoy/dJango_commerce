import { notFound } from "next/navigation";

import { CartContent } from "@/app/(site)/cart/cart-content";
import { getHostRoute } from "@/lib/host-route";

export default async function CartPage() {
  const route = await getHostRoute();

  if (route.kind !== "tenant") notFound();

  return <CartContent tenantSlug={route.tenantSlug} />;
}
