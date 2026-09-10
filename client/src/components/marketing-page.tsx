import Link from "next/link";

import { Button } from "@/components/ui/button";

export function MarketingPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-6 text-zinc-950">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col items-center justify-center py-24 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
          Multi-tenant commerce
        </p>
        <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-tight sm:text-7xl">
          Build a storefront your customers remember.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600">
          Launch and manage your online store from one platform, with a dedicated
          storefront for every brand.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/signup">Create your store</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Log in</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
