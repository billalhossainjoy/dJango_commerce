import { notFound } from "next/navigation";

import { ProductDetails } from "@/app/(site)/products/[slug]/product-details";
import { getHostRoute } from "@/lib/host-route";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [route, { slug }] = await Promise.all([getHostRoute(), params]);

  if (route.kind !== "tenant") notFound();

  return <ProductDetails tenantSlug={route.tenantSlug} productSlug={slug} />;
}
