import Image from "next/image";
import Link from "next/link";

import type { StorefrontProduct } from "@/app/(site)/products/product.service";
import { formatUsd } from "@/lib/format";

export function StorefrontProductCard({
  product,
}: {
  product: StorefrontProduct;
}) {
  const primaryImage = product.images[0];

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-zinc-100">
        {primaryImage?.url ? (
          <Image
            src={primaryImage.url}
            alt={primaryImage.alt_text || product.name}
            fill
            unoptimized
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-400">
            No image
          </div>
        )}
        {product.stock_quantity === 0 ? (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-red-600 shadow-sm">
            Out of stock
          </span>
        ) : null}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-semibold text-zinc-950 transition group-hover:text-indigo-700">
            {product.name}
          </h3>
          <p className="shrink-0 font-semibold text-zinc-950">
            {formatUsd(product.price_cents)}
          </p>
        </div>
        {product.description ? (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-600">
            {product.description}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
