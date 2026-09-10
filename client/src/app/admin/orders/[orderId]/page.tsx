import { OrderDetails } from "@/app/admin/orders/[orderId]/order-details";

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <OrderDetails orderId={orderId} />;
}
