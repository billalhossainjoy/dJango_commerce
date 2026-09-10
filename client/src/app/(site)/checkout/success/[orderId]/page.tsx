import { notFound } from "next/navigation";

import { OrderConfirmation } from "@/app/(site)/checkout/success/[orderId]/order-confirmation";
import { getHostRoute } from "@/lib/host-route";

export default async function OrderSuccessPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const [route, { orderId }] = await Promise.all([getHostRoute(), params]);

  if (route.kind !== "tenant") notFound();

  return <OrderConfirmation tenantSlug={route.tenantSlug} orderId={orderId} />;
}
