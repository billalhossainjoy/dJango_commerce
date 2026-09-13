"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useCart } from "@/app/(site)/cart/use-cart";
import { useCreateOrder } from "@/app/(site)/checkout/use-checkout";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { FormInput } from "@/components/ui/form-input";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatUsd } from "@/lib/format";

const checkoutSchema = z.object({
  email: z.email("Enter a valid email address."),
  shippingName: z.string().trim().min(1, "Enter the recipient name."),
  addressLine1: z.string().trim().min(1, "Enter a street address."),
  addressLine2: z.string().trim(),
  city: z.string().trim().min(1, "Enter a city."),
  region: z.string().trim(),
  postalCode: z.string().trim().min(1, "Enter a postal code."),
  countryCode: z
    .string()
    .trim()
    .length(2, "Use a two-letter country code."),
});

type CheckoutValues = z.infer<typeof checkoutSchema>;

const defaultValues: CheckoutValues = {
  email: "",
  shippingName: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  region: "",
  postalCode: "",
  countryCode: "",
};

const inputClassName =
  "h-12 rounded-lg border-zinc-300 bg-white px-3.5 text-base text-zinc-950 placeholder:text-zinc-400 focus-visible:border-indigo-600 focus-visible:ring-indigo-600/15 md:text-sm dark:bg-white";

export function CheckoutForm({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter();
  const cart = useCart(tenantSlug);
  const createOrder = useCreateOrder(tenantSlug);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues,
  });

  const submit = handleSubmit(async (values) => {
    try {
      const order = await createOrder.mutateAsync({
        idempotencyKey,
        input: {
          email: values.email,
          shipping_name: values.shippingName,
          shipping_address_line_1: values.addressLine1,
          shipping_address_line_2: values.addressLine2,
          shipping_city: values.city,
          shipping_region: values.region,
          shipping_postal_code: values.postalCode,
          shipping_country_code: values.countryCode.toUpperCase(),
        },
      });
      router.replace(`/checkout/success/${order.id}`);
    } catch (error) {
      setError("root", {
        message: getApiErrorMessage(error, "Unable to create your order."),
      });
    }
  });

  if (cart.isPending) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-7xl px-6 py-16 text-zinc-600">
        Loading checkout…
      </main>
    );
  }

  if (cart.isError) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-7xl px-6 py-16">
        <h1 className="text-3xl font-semibold text-zinc-950">
          Checkout unavailable
        </h1>
        <p className="mt-3 text-zinc-600">Please refresh and try again.</p>
      </main>
    );
  }

  if (createOrder.data) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-7xl px-6 py-16 text-zinc-600">
        Opening your order…
      </main>
    );
  }

  if (cart.data.items.length === 0) {
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-16">
        <section className="mx-auto max-w-xl rounded-3xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
          <h1 className="text-3xl font-semibold text-zinc-950">
            Your cart is empty
          </h1>
          <p className="mt-3 text-zinc-600">
            Add a product before starting checkout.
          </p>
          <Link
            href="/#products"
            className="mt-7 inline-block rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Browse products
          </Link>
        </section>
      </main>
    );
  }

  const shippingCents = 500;
  const totalCents = cart.data.subtotal_cents + shippingCents;

  return (
    <main className="checkout-theme min-h-screen border-t border-zinc-200 bg-[#f7f7f5] text-zinc-950">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <nav aria-label="Checkout progress" className="text-sm text-zinc-500">
          <Link className="font-medium text-indigo-700 hover:text-indigo-800" href="/cart">
            Cart
          </Link>
          <span aria-hidden="true" className="mx-2 text-zinc-300">
            /
          </span>
          <span className="font-medium text-zinc-900">Information</span>
          <span aria-hidden="true" className="mx-2 text-zinc-300">
            /
          </span>
          <span>Confirmation</span>
        </nav>

        <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12">
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Checkout
              </h1>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Complete your delivery details and confirm your order.
              </p>
            </div>

            <form className="space-y-5" onSubmit={submit}>
              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-5 flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-full bg-zinc-950 text-sm font-bold text-white">
                    1
                  </span>
                  <div>
                    <h2 className="font-semibold">Contact information</h2>
                    <p className="text-sm text-zinc-500">
                      We will use this email for your order updates.
                    </p>
                  </div>
                </div>
                <FormInput
                  id="checkout-email"
                  label="Email address"
                  type="email"
                  autoComplete="email"
                  className={inputClassName}
                  error={errors.email}
                  {...register("email")}
                />
              </section>

              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-5 flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-full bg-zinc-950 text-sm font-bold text-white">
                    2
                  </span>
                  <div>
                    <h2 className="font-semibold">Delivery address</h2>
                    <p className="text-sm text-zinc-500">
                      Enter the address where you want to receive your order.
                    </p>
                  </div>
                </div>
                <FieldGroup>
                  <FormInput
                    id="checkout-name"
                    label="Full name"
                    autoComplete="name"
                    className={inputClassName}
                    error={errors.shippingName}
                    {...register("shippingName")}
                  />
                  <FormInput
                    id="checkout-address-line-1"
                    label="Street address"
                    autoComplete="address-line1"
                    className={inputClassName}
                    error={errors.addressLine1}
                    {...register("addressLine1")}
                  />
                  <FormInput
                    id="checkout-address-line-2"
                    label="Apartment, suite, etc. (optional)"
                    autoComplete="address-line2"
                    className={inputClassName}
                    error={errors.addressLine2}
                    {...register("addressLine2")}
                  />
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormInput
                      id="checkout-city"
                      label="City"
                      autoComplete="address-level2"
                      className={inputClassName}
                      error={errors.city}
                      {...register("city")}
                    />
                    <FormInput
                      id="checkout-region"
                      label="State / region (optional)"
                      autoComplete="address-level1"
                      className={inputClassName}
                      error={errors.region}
                      {...register("region")}
                    />
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormInput
                      id="checkout-postal-code"
                      label="Postal code"
                      autoComplete="postal-code"
                      className={inputClassName}
                      error={errors.postalCode}
                      {...register("postalCode")}
                    />
                    <FormInput
                      id="checkout-country"
                      label="Country code"
                      placeholder="BD"
                      autoComplete="country"
                      maxLength={2}
                      className={inputClassName}
                      error={errors.countryCode}
                      {...register("countryCode")}
                    />
                  </div>
                </FieldGroup>
              </section>

              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-5 flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-full bg-zinc-950 text-sm font-bold text-white">
                    3
                  </span>
                  <div>
                    <h2 className="font-semibold">Payment</h2>
                    <p className="text-sm text-zinc-500">
                      The available payment method for this store.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-xl border-2 border-indigo-600 bg-indigo-50/60 p-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-xl shadow-sm">
                    💵
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-950">Cash on delivery</p>
                    <p className="mt-0.5 text-sm text-zinc-600">
                      Pay in cash when your order arrives.
                    </p>
                  </div>
                  <span className="grid size-5 place-items-center rounded-full border-[5px] border-indigo-600 bg-white" />
                </div>
              </section>

              <FieldError>{errors.root?.message}</FieldError>
              <Button
                className="h-13 w-full rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-600/15 hover:bg-indigo-700 sm:text-base"
                type="submit"
                disabled={createOrder.isPending}
              >
                {createOrder.isPending
                  ? "Confirming your order…"
                  : `Confirm order · ${formatUsd(totalCents)}`}
              </Button>
              <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
                <LockIcon />
                Your order information is securely submitted.
              </div>
            </form>
          </div>

          <aside className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm lg:sticky lg:top-24">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-5 sm:px-6">
              <div>
                <h2 className="text-lg font-bold">Order summary</h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {cart.data.item_count} item
                  {cart.data.item_count === 1 ? "" : "s"}
                </p>
              </div>
              <Link
                href="/cart"
                className="text-sm font-semibold text-indigo-700 hover:text-indigo-800"
              >
                Edit
              </Link>
            </div>

            <div className="max-h-80 space-y-5 overflow-y-auto px-5 py-6 sm:px-6">
              {cart.data.items.map((item) => {
                const image = item.product.images[0];
                return (
                  <div className="flex gap-4" key={item.id}>
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                      {image?.url ? (
                        <Image
                          alt={image.alt_text || item.product.name}
                          className="object-cover"
                          fill
                          unoptimized
                          src={image.url}
                        />
                      ) : null}
                      <span className="absolute -right-1 -top-1 z-10 grid size-5 place-items-center rounded-full bg-zinc-800 text-[10px] font-bold text-white ring-2 ring-white">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 py-1">
                      <p className="line-clamp-2 text-sm font-semibold leading-5">
                        {item.product.name}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {formatUsd(item.product.price_cents)} each
                      </p>
                    </div>
                    <p className="shrink-0 py-1 text-sm font-semibold">
                      {formatUsd(item.line_total_cents)}
                    </p>
                  </div>
                );
              })}
            </div>

            <dl className="space-y-3 border-t border-zinc-200 bg-zinc-50/70 px-5 py-5 text-sm sm:px-6">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-600">Subtotal</dt>
                <dd className="font-medium">{formatUsd(cart.data.subtotal_cents)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-600">Shipping</dt>
                <dd className="font-medium">{formatUsd(shippingCents)}</dd>
              </div>
              <div className="flex items-end justify-between gap-4 border-t border-zinc-200 pt-4">
                <dt className="text-base font-bold">Total</dt>
                <dd>
                  <span className="mr-2 text-xs font-medium text-zinc-500">USD</span>
                  <span className="text-2xl font-bold tracking-tight">
                    {formatUsd(totalCents)}
                  </span>
                </dd>
              </div>
            </dl>

            <div className="flex gap-3 border-t border-zinc-200 px-5 py-4 text-xs leading-5 text-zinc-500 sm:px-6">
              <DeliveryIcon />
              Flat-rate delivery. You will pay only when the package arrives.
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 24 24">
      <rect height="11" rx="2" stroke="currentColor" strokeWidth="2" width="14" x="5" y="10" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function DeliveryIcon() {
  return (
    <svg aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-indigo-600" fill="none" viewBox="0 0 24 24">
      <path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
      <circle cx="7" cy="18" r="2" fill="white" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="18" r="2" fill="white" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
