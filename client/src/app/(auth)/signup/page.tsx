import type { Metadata } from "next";
import Link from "next/link";

import { SignupForm } from "@/app/(auth)/signup/signup-form";
import { CustomerSignupForm } from "@/app/(auth)/signup/customer-signup-form";
import { getHostRoute } from "@/lib/host-route";

export const metadata: Metadata = {
  title: "Create account",
};

export default async function SignupPage() {
  const route = await getHostRoute();
  const tenantSlug = route.kind === "tenant" ? route.tenantSlug : null;

  return (
    <>
      <h1 className="mt-4 text-2xl font-semibold">
        {tenantSlug ? "Create customer account" : "Create your store"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter your details to get started.
      </p>
      {tenantSlug ? (
        <CustomerSignupForm tenantSlug={tenantSlug} />
      ) : (
        <SignupForm />
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link className="font-medium text-primary underline underline-offset-4 hover:text-primary/80" href="/login">
          Log in
        </Link>
      </p>
    </>
  );
}
