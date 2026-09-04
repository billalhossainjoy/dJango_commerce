import type { Metadata } from "next";
import Link from "next/link";

import { SignupForm } from "@/app/(auth)/signup/signup-form";

export const metadata: Metadata = {
  title: "Create account",
};

export default function SignupPage() {
  return (
    <>
      <h1 className="mt-4 text-2xl font-semibold">Create account</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Enter your details to get started.
      </p>
      <SignupForm />
      <p className="mt-6 text-center text-sm text-zinc-600">
        Already have an account?{" "}
        <Link className="font-medium text-zinc-950 underline" href="/login">
          Log in
        </Link>
      </p>
    </>
  );
}
