import type { Metadata } from "next";

import { AccountEmailForm } from "@/components/auth/account-email-form";
import { getHostRoute } from "@/lib/host-route";

export const metadata: Metadata = {
  title: "Reset password",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ uid?: string | string[]; token?: string | string[] }>;
}) {
  const route = await getHostRoute();
  const params = await searchParams;
  return (
    <AccountEmailForm
      mode="reset"
      tenantSlug={route.kind === "tenant" ? route.tenantSlug : null}
      uid={typeof params.uid === "string" ? params.uid : undefined}
      token={typeof params.token === "string" ? params.token : undefined}
    />
  );
}
