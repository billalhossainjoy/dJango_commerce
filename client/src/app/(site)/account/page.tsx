import { AccountContent } from "@/app/(site)/account/account-content";
import { CustomerOnly } from "@/components/auth/customer-only";
import { getHostRoute } from "@/lib/host-route";

export default async function AccountPage() {
  const route = await getHostRoute();

  if (route.kind !== "tenant") {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-20">
        <h1 className="text-3xl font-semibold">Customer account unavailable</h1>
        <p className="mt-2 text-muted-foreground">Open this page from a tenant storefront.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <p className="text-sm font-medium text-muted-foreground">My account</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Account</h1>
      <div className="mt-8">
        <CustomerOnly tenantSlug={route.tenantSlug}>
          <AccountContent tenantSlug={route.tenantSlug} />
        </CustomerOnly>
      </div>
    </div>
  );
}
