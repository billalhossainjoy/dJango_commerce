"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

import type {
  Subscription,
  SubscriptionStatus,
} from "@/app/admin/billing/billing.service";
import {
  useOpenBillingPortal,
  useStartSubscriptionCheckout,
  useSubscription,
} from "@/app/admin/billing/use-billing";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-client";

const statusLabels: Record<SubscriptionStatus, string> = {
  not_started: "No subscription",
  incomplete: "Checkout incomplete",
  incomplete_expired: "Checkout expired",
  trialing: "Free trial",
  active: "Active",
  past_due: "Payment past due",
  canceled: "Canceled",
  unpaid: "Unpaid",
  paused: "Paused",
};

const canStartCheckout: SubscriptionStatus[] = [
  "not_started",
  "incomplete",
  "incomplete_expired",
  "canceled",
];

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "long" });

export function BillingPanel() {
  const searchParams = useSearchParams();
  const checkoutSucceeded = searchParams.get("checkout") === "success";
  const subscription = useSubscription(checkoutSucceeded);
  const checkout = useStartSubscriptionCheckout();
  const portal = useOpenBillingPortal();

  if (subscription.isPending) {
    return <div className="h-96 animate-pulse rounded-2xl bg-white" />;
  }
  if (subscription.isError) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Unable to load subscription details. Refresh and try again.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {searchParams.get("subscription") === "required" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Start your free trial or subscription before activating your store.
        </div>
      ) : null}
      {checkoutSucceeded ? (
        <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {subscription.data.has_access
              ? "Your subscription is ready. You can now activate your store."
              : "Checkout completed. Stripe is confirming your subscription status…"}
          </span>
          {subscription.data.has_access ? (
            <Button asChild size="sm" className="w-fit">
              <Link href="/admin">Go to dashboard</Link>
            </Button>
          ) : null}
        </div>
      ) : null}
      {searchParams.get("checkout") === "cancelled" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Checkout was cancelled. Your store was not charged.
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-950">Platform subscription</h2>
            <p className="mt-1 text-sm text-slate-500">
              Billing for your tenant storefront and admin workspace.
            </p>
          </div>
          <StatusBadge status={subscription.data.status} />
        </div>

        <div className="grid gap-8 p-6 lg:grid-cols-[1fr_280px]">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Start with 14 days free
            </p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Stripe securely collects your payment method. Your first payment
              is due after the trial unless you cancel before it ends.
            </p>
            <SubscriptionDates subscription={subscription.data} />

            {checkout.isError ? (
              <p className="mt-5 text-sm text-red-700">
                {getApiErrorMessage(
                  checkout.error,
                  "Unable to open Stripe Checkout.",
                )}
              </p>
            ) : null}
            {portal.isError ? (
              <p className="mt-5 text-sm text-red-700">
                {getApiErrorMessage(
                  portal.error,
                  "Unable to open the Stripe billing portal.",
                )}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              {canStartCheckout.includes(subscription.data.status) ? (
                <Button
                  className="h-11 bg-indigo-600 px-6 text-sm text-white hover:bg-indigo-700"
                  disabled={checkout.isPending || portal.isPending}
                  onClick={() => checkout.mutate()}
                >
                  {checkout.isPending
                    ? "Opening Stripe…"
                    : "Start 14-day free trial"}
                </Button>
              ) : null}
              {subscription.data.can_manage ? (
                <Button
                  variant="outline"
                  className="h-11 px-6 text-sm"
                  disabled={checkout.isPending || portal.isPending}
                  onClick={() => portal.mutate()}
                >
                  {portal.isPending ? "Opening portal…" : "Manage billing"}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl bg-slate-950 p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
              Included
            </p>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              <li>Tenant storefront</li>
              <li>Product and image management</li>
              <li>Customer and order management</li>
              <li>Secure Stripe billing</li>
            </ul>
          </div>
        </div>
      </section>

      <Button variant="outline" onClick={() => void subscription.refetch()}>
        Refresh subscription status
      </Button>
    </div>
  );
}

function StatusBadge({ status }: { status: SubscriptionStatus }) {
  const healthy = status === "trialing" || status === "active";
  return (
    <span
      className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
        healthy
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-700"
      }`}
    >
      {statusLabels[status]}
    </span>
  );
}

function SubscriptionDates({ subscription }: { subscription: Subscription }) {
  if (subscription.status === "trialing" && subscription.trial_ends_at) {
    return (
      <p className="mt-5 text-sm text-slate-600">
        Trial ends {dateFormatter.format(new Date(subscription.trial_ends_at))}
      </p>
    );
  }
  if (subscription.current_period_ends_at) {
    return (
      <p className="mt-5 text-sm text-slate-600">
        Current period ends{" "}
        {dateFormatter.format(new Date(subscription.current_period_ends_at))}
      </p>
    );
  }
  return null;
}
