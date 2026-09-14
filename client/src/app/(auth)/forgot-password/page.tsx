import type { Metadata } from "next";

import { AccountEmailForm } from "@/components/auth/account-email-form";
import { getHostRoute } from "@/lib/host-route";

export const metadata: Metadata = {
  title: "Forgot password",
  robots: { index: false, follow: false },
};

export default async function ForgotPasswordPage() {
  const route = await getHostRoute();
  return (
    <AccountEmailForm
      mode="forgot"
      tenantSlug={route.kind === "tenant" ? route.tenantSlug : null}
    />
  );
}
