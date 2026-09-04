import type { Metadata } from "next";

import { LoginForm } from "@/app/(auth)/login/login-form";
import { getHostRoute } from "@/lib/host-route";

export const metadata: Metadata = {
  title: "Log in",
};

function safeNext(value: string | string[] | undefined): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/";
  }
  return value;
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const [route, query] = await Promise.all([getHostRoute(), searchParams]);
  const tenantSlug = route.kind === "tenant" ? route.tenantSlug : null;

  return (
    <>
      <h1 className="mt-4 text-2xl font-semibold">
        {tenantSlug ? "Customer login" : "Store owner login"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter your details to continue.
      </p>
      <LoginForm tenantSlug={tenantSlug} nextPath={safeNext(query.next)} />
    </>
  );
}
