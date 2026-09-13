import Link from "next/link";

import { Button } from "@/components/ui/button";

const features = [
  {
    title: "Your own storefront",
    description:
      "Launch on a dedicated subdomain with a clean shopping experience built for your brand.",
    icon: "01",
  },
  {
    title: "Simple product management",
    description:
      "Manage products, inventory, pricing, and Cloudinary images from one focused dashboard.",
    icon: "02",
  },
  {
    title: "Orders and customers",
    description:
      "Track every order, update fulfillment status, and manage your customer relationships.",
    icon: "03",
  },
] as const;

const steps = [
  ["Create your account", "Tell us about your store and choose its subdomain."],
  ["Add your catalog", "Upload product details, inventory, and images."],
  ["Start selling", "Share your storefront and manage orders as they arrive."],
] as const;

export function MarketingPage() {
  return (
    <div className="account-theme bg-white text-slate-950">
      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-950 text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_20%_80%,rgba(99,102,241,0.2),transparent_35%)]"
        />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-200">
              <span className="size-1.5 rounded-full bg-cyan-300" />
              14-day free trial · No setup fee
            </div>
            <h1 className="mt-7 max-w-3xl text-5xl font-bold leading-[1.05] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Everything you need to run your online store.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Create a branded storefront, publish products, serve customers,
              and manage orders from one straightforward commerce platform.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button
                asChild
                className="h-11 bg-cyan-300 px-5 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
              >
                <Link href="/signup">Start your free trial</Link>
              </Button>
              <Button
                asChild
                className="h-11 border-slate-600 bg-transparent px-5 text-sm text-white hover:bg-white/10 hover:text-white"
                variant="outline"
              >
                <Link href="#how-it-works">See how it works</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Get started in minutes. Cancel anytime.
            </p>
          </div>

          <DashboardPreview />
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
            One connected platform
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Focus on your products, not your infrastructure.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            The important parts of running an online store are already connected
            and ready for your team.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <article
              className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50"
              key={feature.title}
            >
              <span className="grid size-10 place-items-center rounded-xl bg-indigo-600 text-xs font-bold text-white">
                {feature.icon}
              </span>
              <h3 className="mt-6 text-lg font-bold">{feature.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
                From idea to first order
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Open your store in three simple steps.
              </h2>
            </div>
            <ol className="space-y-4">
              {steps.map(([title, description], index) => (
                <li
                  className="flex gap-5 rounded-2xl border border-slate-200 bg-white p-5"
                  key={title}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-950 text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-950">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
        <div className="overflow-hidden rounded-3xl bg-indigo-600 px-6 py-12 text-center text-white sm:px-12 sm:py-16">
          <p className="text-sm font-semibold text-indigo-100">
            Your next chapter starts here
          </p>
          <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            Build the storefront your business deserves.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-indigo-100">
            Try the complete platform free for 14 days and turn your catalog
            into a store customers can visit today.
          </p>
          <Button
            asChild
            className="mt-8 h-11 bg-white px-5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
          >
            <Link href="/signup">Create your store</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-slate-950">E-commerce</p>
            <p className="mt-1">A simpler way to sell online.</p>
          </div>
          <div className="flex items-center gap-5">
            <Link className="transition hover:text-slate-950" href="/login">
              Log in
            </Link>
            <Link className="transition hover:text-slate-950" href="/signup">
              Start selling
            </Link>
          </div>
          <p>© {new Date().getFullYear()} E-commerce</p>
        </div>
      </footer>
    </div>
  );
}

function DashboardPreview() {
  const metrics = [
    ["Revenue", "$8,420"],
    ["Orders", "184"],
    ["Customers", "326"],
  ] as const;
  const orders = [
    ["#1048", "Processing", "$128.00"],
    ["#1047", "Shipped", "$86.50"],
    ["#1046", "Delivered", "$214.00"],
  ] as const;

  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-2 shadow-2xl shadow-black/30 backdrop-blur">
      <div className="overflow-hidden rounded-xl bg-slate-50 text-slate-950">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs text-slate-500">Store dashboard</p>
            <p className="mt-0.5 text-sm font-bold">Good morning</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            Store live
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 p-5">
          {metrics.map(([label, value]) => (
            <div className="rounded-lg border border-slate-200 bg-white p-3" key={label}>
              <p className="text-[10px] text-slate-500">{label}</p>
              <p className="mt-1 text-sm font-bold sm:text-base">{value}</p>
            </div>
          ))}
        </div>
        <div className="px-5 pb-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold">Recent orders</p>
              <p className="text-[10px] text-indigo-600">View all</p>
            </div>
            <div className="mt-4 space-y-3">
              {orders.map(([order, status, amount]) => (
                <div
                  className="grid grid-cols-[1fr_1fr_auto] items-center border-t border-slate-100 pt-3 text-[11px]"
                  key={order}
                >
                  <span className="font-semibold">{order}</span>
                  <span className="text-slate-500">{status}</span>
                  <span className="font-semibold">{amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
