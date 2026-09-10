const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatUsd(priceCents: number): string {
  return usdFormatter.format(priceCents / 100);
}
