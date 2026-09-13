import Link from "next/link";

export default function CustomerOrdersPage() {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-700">
        Orders
      </p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
        Order history
      </h2>
      <p className="mt-2 text-zinc-600">
        Review purchases made from this store.
      </p>

      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm sm:p-12">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-zinc-100 text-2xl">
          📦
        </div>
        <h3 className="mt-5 text-xl font-semibold text-zinc-950">
          No orders yet
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
          When you place an order, its status and details will appear here.
        </p>
        <Link
          href="/#products"
          className="mt-6 inline-block rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          Start shopping
        </Link>
      </section>
    </div>
  );
}
