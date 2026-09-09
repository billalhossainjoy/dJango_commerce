"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import type { TenantSettings } from "@/app/admin/settings/tenant-settings.service";
import {
  useTenantSettings,
  useUpdateTenantSettings,
} from "@/app/admin/settings/use-tenant-settings";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { FormInput } from "@/components/ui/form-input";
import { getApiErrorMessage } from "@/lib/api-client";

const schema = z.object({
  name: z.string().trim().min(1, "Enter a store name.").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/,
      "Use letters, numbers, or hyphens.",
    ),
});

type Values = z.infer<typeof schema>;

export function TenantSettingsForm() {
  const settings = useTenantSettings();

  if (settings.isPending) {
    return <div className="h-72 animate-pulse rounded-2xl bg-white" />;
  }
  if (settings.isError) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Unable to load store settings. Refresh and try again.
      </p>
    );
  }

  return <SettingsForm settings={settings.data} />;
}

function SettingsForm({ settings }: { settings: TenantSettings }) {
  const updateSettings = useUpdateTenantSettings();
  const rootDomain = settings.subdomain.slice(settings.slug.length + 1);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: settings.name, slug: settings.slug },
  });
  const slug = useWatch({ control, name: "slug" });

  const submit = handleSubmit(async (values) => {
    try {
      const updated = await updateSettings.mutateAsync(values);
      reset({ name: updated.name, slug: updated.slug });
      if (updated.slug !== settings.slug) {
        const destination = new URL(window.location.href);
        destination.hostname = updated.subdomain;
        destination.pathname = "/admin/settings";
        destination.search = "";
        destination.hash = "";
        window.location.assign(destination);
      }
    } catch (error) {
      setError("root", {
        message: getApiErrorMessage(error, "Unable to update store settings."),
      });
    }
  });

  return (
    <form
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      onSubmit={submit}
    >
      <div className="border-b border-slate-100 pb-5">
        <h2 className="font-bold text-slate-950">Store identity</h2>
        <p className="mt-1 text-sm text-slate-500">
          Update the public name and platform address for your store.
        </p>
      </div>

      <FieldGroup className="mt-6 max-w-2xl">
        <FormInput
          id="tenant-name"
          label="Store name"
          autoComplete="organization"
          error={errors.name}
          {...register("name")}
        />
        <div>
          <FormInput
            id="tenant-subdomain"
            label="Subdomain"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            error={errors.slug}
            {...register("slug")}
          />
          <p className="mt-2 text-xs text-slate-500">
            New address: {slug || "your-store"}.{rootDomain}
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Changing the subdomain moves your storefront and admin dashboard to a
          new address. You may need to log in again after the change.
        </div>
        <FieldError>{errors.root?.message}</FieldError>
        {updateSettings.isSuccess && !isDirty ? (
          <p className="text-sm font-medium text-emerald-700">Settings saved.</p>
        ) : null}
        <Button
          className="h-10 w-fit bg-indigo-600 px-5 text-sm text-white hover:bg-indigo-700"
          disabled={isSubmitting || !isDirty}
          type="submit"
        >
          {isSubmitting ? "Saving…" : "Save changes"}
        </Button>
      </FieldGroup>
    </form>
  );
}
