import type { FulfillmentStatus } from "@/app/admin/orders/order.service";

export const fulfillmentLabels: Record<FulfillmentStatus, string> = {
  unfulfilled: "Unfulfilled",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
};

export const nextFulfillmentStatus: Partial<
  Record<FulfillmentStatus, FulfillmentStatus>
> = {
  unfulfilled: "processing",
  processing: "shipped",
  shipped: "delivered",
};
