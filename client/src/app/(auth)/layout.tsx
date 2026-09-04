import Link from "next/link";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-12 text-zinc-950">
      <section className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8">
        <Link className="text-sm font-semibold text-zinc-500" href="/">
          E-commerce
        </Link>
        {children}
      </section>
    </main>
  );
}
