"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { AppService, type CurrentUser } from "@/app/app.service";
import { Button } from "@/components/ui/button";
import {
  currentUserQueryKey,
  useCurrentUser,
} from "@/hooks/use-current-user";
import { useAuthStore } from "@/stores/auth-store";

const appService = new AppService();

export default function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useCurrentUser();
  const activation = useMutation({
    mutationFn: () =>
      appService.activateTenant(currentUser.data!.tenant!.slug, accessToken!),
    onSuccess: (tenant) => {
      queryClient.setQueryData<CurrentUser>(currentUserQueryKey, (user) =>
        user?.tenant
          ? { ...user, tenant: { ...user.tenant, ...tenant } }
          : user,
      );
    },
  });

  if (currentUser.isPending) {
    return <p className="text-sm text-zinc-600">Loading your store…</p>;
  }

  if (currentUser.isError) {
    return <p className="text-sm text-red-600">Unable to load your store.</p>;
  }

  if (!currentUser.data.tenant) {
    return <p className="text-sm text-zinc-600">No store is assigned to you.</p>;
  }

  const tenant = currentUser.data.tenant;

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Overview</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        {tenant.name}
      </h1>

      <section className="mt-8 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/60 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Store status</h2>
            <p className="mt-1 text-sm text-zinc-600">
              {tenant.status === "active"
                ? "Your storefront is live."
                : "Activate your store when you are ready to make it public."}
            </p>
          </div>

          {tenant.status === "provisioning" ? (
            <Button
              size="lg"
              disabled={activation.isPending}
              onClick={() => activation.mutate()}
            >
              {activation.isPending ? "Activating…" : "Activate store"}
            </Button>
          ) : (
            <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
              Active
            </span>
          )}
        </div>

        {activation.isError ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            Unable to activate the store. Please try again.
          </p>
        ) : null}
      </section>
    </div>
  );
}
