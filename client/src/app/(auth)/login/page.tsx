import type { Metadata } from "next";

import { LoginForm } from "@/app/(auth)/login/login-form";

export const metadata: Metadata = {
  title: "Log in",
};

export default function LoginPage() {
  return (
    <>
      <h1 className="mt-4 text-2xl font-semibold">Log in</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Enter your details to continue.
      </p>
      <LoginForm />
    </>
  );
}
