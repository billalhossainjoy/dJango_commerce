"use client";

import Link from "next/link";

import { useAuth } from "@/hooks/use-auth";

export function Header() {
  const { logout, status } = useAuth();

  return (
    <header className="border-b border-zinc-200 bg-white text-zinc-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link className="text-lg font-semibold tracking-tight" href="/">
          E-commerce
        </Link>

        <nav className="flex items-center gap-4" aria-label="Account navigation">
          {status === "authenticated" ? (
            <button
              className="text-sm font-medium text-zinc-700 transition hover:text-zinc-950"
              type="button"
              onClick={() => void logout()}
            >
              Log out
            </button>
          ) : status === "unauthenticated" ? (
            <>
              <Link
                className="text-sm font-medium text-zinc-700 transition hover:text-zinc-950"
                href="/login"
              >
                Log in
              </Link>
              <Link
                className="rounded-lg bg-zinc-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
                href="/signup"
              >
                Sign up
              </Link>
            </>
          ) : (
            <span className="text-sm text-zinc-500">Checking session…</span>
          )}
        </nav>
      </div>
    </header>
  );
}
