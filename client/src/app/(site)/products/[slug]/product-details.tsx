"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import {
  useStorefrontProduct,
  useStorefrontProducts,
} from "@/app/(site)/products/use-products";
import { StorefrontProductCard } from "@/components/storefront-product-card";
import { formatUsd } from "@/lib/format";

type ProductDetailsProps = {
  tenantSlug: string;
  productSlug: string;
};

export function ProductDetails({
  tenantSlug,
  productSlug,
}: ProductDetailsProps) {
  const product = useStorefrontProduct(tenantSlug, productSlug);
  const products = useStorefrontProducts(tenantSlug);
  const [selectedImageId, setSelectedImageId] = useState<string>();

  if (product.isPending) {
    return <div className="mx-auto max-w-6xl px-6 py-16">Loading product…</div>;
  }

  if (product.isError) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="text-3xl font-semibold text-zinc-950">
          Product unavailable
        </h1>
        <p className="mt-3 text-zinc-600">
          This product could not be found or is no longer available.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block font-semibold text-indigo-700 hover:text-indigo-800"
        >
          Back to store
        </Link>
      </div>
    );
  }

  const selectedImage =
    product.data.images.find((image) => image.id === selectedImageId) ??
    product.data.images[0];
  const inStock = product.data.stock_quantity > 0;
  const suggestedProducts = (products.data ?? [])
    .filter((suggestion) => suggestion.id !== product.data.id)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <section className="mx-auto max-w-7xl px-6 pt-8 sm:pt-12">
        <nav className="flex items-center gap-2 text-sm text-zinc-500">
          <Link href="/" className="transition hover:text-indigo-700">
            Store
          </Link>
          <span aria-hidden="true">/</span>
          <span className="truncate text-zinc-800">{product.data.name}</span>
        </nav>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-8 lg:grid-cols-2 lg:gap-16 lg:py-12">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
            {selectedImage?.url ? (
              <Image
                src={selectedImage.url}
                alt={selectedImage.alt_text || product.data.name}
                fill
                priority
                unoptimized
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-400">
                No image available
              </div>
            )}
          </div>

          {product.data.images.length > 1 ? (
            <div className="mt-4 grid grid-cols-5 gap-3">
              {product.data.images.map((image) => (
                <button
                  key={image.id}
                  type="button"
                  aria-label={`View ${image.alt_text || product.data.name}`}
                  aria-pressed={image.id === selectedImage?.id}
                  className={`relative aspect-square overflow-hidden rounded-xl border-2 bg-zinc-100 transition ${
                    image.id === selectedImage?.id
                      ? "border-indigo-600 shadow-sm"
                      : "border-transparent hover:border-zinc-300"
                  }`}
                  onClick={() => setSelectedImageId(image.id)}
                >
                  {image.url ? (
                    <Image
                      src={image.url}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start lg:py-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-700">
            {tenantSlug}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            {product.data.name}
          </h1>
          <p className="mt-6 text-3xl font-semibold tracking-tight">
            {formatUsd(product.data.price_cents)}
          </p>
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-zinc-600">Availability</span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  inStock
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {inStock
                  ? `${product.data.stock_quantity} in stock`
                  : "Out of stock"}
              </span>
            </div>
          </div>
          {product.data.description ? (
            <div className="mt-8 border-t border-zinc-200 pt-8">
              <h2 className="font-semibold text-zinc-950">Description</h2>
              <p className="mt-3 whitespace-pre-line leading-7 text-zinc-600">
                {product.data.description}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {suggestedProducts.length > 0 ? (
        <section className="border-t border-zinc-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-700">
                  More to explore
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                  You may also like
                </h2>
              </div>
              <Link
                href="/"
                className="hidden text-sm font-semibold text-indigo-700 hover:text-indigo-800 sm:block"
              >
                View all products →
              </Link>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {suggestedProducts.map((suggestion) => (
                <StorefrontProductCard
                  key={suggestion.id}
                  product={suggestion}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
