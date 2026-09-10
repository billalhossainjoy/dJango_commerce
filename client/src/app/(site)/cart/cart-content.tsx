"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import {
  useCart,
  useRemoveCartItem,
  useUpdateCartItem,
} from "@/app/(site)/cart/use-cart";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatUsd } from "@/lib/format";

export function CartContent({ tenantSlug }: { tenantSlug: string }) {
  const cart = useCart(tenantSlug);
  const updateItem = useUpdateCartItem(tenantSlug);
  const removeItem = useRemoveCartItem(tenantSlug);
  const [error, setError] = useState<string>();
  const isChanging = updateItem.isPending || removeItem.isPending;

  async function changeQuantity(itemId: string, quantity: number) {
    setError(undefined);
    try {
      await updateItem.mutateAsync({ itemId, quantity });
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Unable to update this cart item."),
      );
    }
  }

  async function remove(itemId: string) {
    setError(undefined);
    try {
      await removeItem.mutateAsync(itemId);
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Unable to remove this cart item."),
      );
    }
  }

  if (cart.isPending) {
    return (
      <div className="mx-auto w-full max-w-7xl px-6 py-16 text-zinc-600">
        Loading your cart…
      </div>
    );
  }

  if (cart.isError) {
    return (
      <div className="mx-auto w-full max-w-7xl px-6 py-16">
        <h1 className="text-3xl font-semibold text-zinc-950">
          Cart unavailable
        </h1>
        <p className="mt-3 text-zinc-600">Please refresh and try again.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto w-full max-w-7xl px-6 py-12 sm:py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-700">
          Your selection
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">Shopping cart</h1>
            <p className="mt-2 text-zinc-600">
              {cart.data.item_count} item{cart.data.item_count === 1 ? "" : "s"} in
              your cart
            </p>
          </div>
          <Link
            href="/#products"
            className="text-sm font-semibold text-indigo-700 hover:text-indigo-800"
          >
            Continue shopping →
          </Link>
        </div>

        {cart.data.items.length === 0 ? (
          <section className="mt-10 rounded-3xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-zinc-100 text-2xl">
              🛒
            </div>
            <h2 className="mt-5 text-2xl font-semibold">Your cart is empty</h2>
            <p className="mt-2 text-zinc-600">
              Explore the collection and add something you like.
            </p>
            <Link
              href="/#products"
              className="mt-7 inline-block rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Browse products
            </Link>
          </section>
        ) : (
          <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <h2 className="sr-only">Cart items</h2>
              <div className="divide-y divide-zinc-200">
                {cart.data.items.map((item) => {
                  const image = item.product.images[0];

                  return (
                    <article
                      key={item.id}
                      className="grid grid-cols-[96px_minmax(0,1fr)] gap-4 p-4 sm:grid-cols-[128px_minmax(0,1fr)] sm:gap-6 sm:p-6"
                    >
                      <Link
                        href={`/products/${item.product.slug}`}
                        className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100"
                      >
                        {image?.url ? (
                          <Image
                            src={image.url}
                            alt={image.alt_text || item.product.name}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        ) : null}
                      </Link>
                      <div className="flex min-w-0 flex-col justify-between gap-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <Link
                              href={`/products/${item.product.slug}`}
                              className="font-semibold text-zinc-950 hover:text-indigo-700"
                            >
                              {item.product.name}
                            </Link>
                            <p className="mt-1 text-sm text-zinc-500">
                              {formatUsd(item.product.price_cents)} each
                            </p>
                          </div>
                          <p className="shrink-0 font-semibold">
                            {formatUsd(item.line_total_cents)}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="flex h-10 items-center overflow-hidden rounded-lg border border-zinc-300">
                            <button
                              type="button"
                              aria-label={`Decrease ${item.product.name} quantity`}
                              disabled={isChanging || item.quantity === 1}
                              className="h-full px-3 text-lg hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                              onClick={() =>
                                void changeQuantity(item.id, item.quantity - 1)
                              }
                            >
                              −
                            </button>
                            <span className="grid h-full min-w-10 place-items-center border-x border-zinc-300 px-2 text-sm font-semibold">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label={`Increase ${item.product.name} quantity`}
                              disabled={
                                isChanging ||
                                item.quantity >= item.product.stock_quantity ||
                                item.quantity >= 99
                              }
                              className="h-full px-3 text-lg hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                              onClick={() =>
                                void changeQuantity(item.id, item.quantity + 1)
                              }
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            disabled={isChanging}
                            className="text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                            onClick={() => void remove(item.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <aside className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm lg:sticky lg:top-24">
              <h2 className="text-xl font-semibold">Order summary</h2>
              <div className="mt-6 flex items-center justify-between border-b border-zinc-200 pb-5 text-sm">
                <span className="text-zinc-600">Subtotal</span>
                <span className="font-semibold">
                  {formatUsd(cart.data.subtotal_cents)}
                </span>
              </div>
              <p className="mt-4 text-xs leading-5 text-zinc-500">
                Shipping and final totals will be calculated during checkout.
              </p>
              <Link
                href="/checkout"
                className="mt-6 grid h-12 w-full place-items-center rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Continue to checkout
              </Link>
            </aside>
          </div>
        )}

        {error ? (
          <p role="alert" className="mt-6 text-sm font-medium text-red-600">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
