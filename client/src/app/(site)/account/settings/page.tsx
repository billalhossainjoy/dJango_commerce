"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useAccountTenantSlug } from "@/app/(site)/account/account-shell";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { FormInput } from "@/components/ui/form-input";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import {
  useChangeCustomerPassword,
  useCurrentCustomer,
  useUpdateCustomerProfile,
} from "@/hooks/use-current-customer";
import { getApiErrorMessage } from "@/lib/api-client";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(120),
  email: z.email("Enter a valid email address."),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z
      .string()
      .min(8, "Password must contain at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine(
    ({ newPassword, confirmPassword }) => newPassword === confirmPassword,
    { message: "Passwords do not match.", path: ["confirmPassword"] },
  );

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

export default function CustomerSettingsPage() {
  const tenantSlug = useAccountTenantSlug();
  const auth = useCustomerAuth(tenantSlug);
  const customer = useCurrentCustomer(tenantSlug);

  if (customer.isPending) {
    return <p className="text-sm text-zinc-600">Loading settings…</p>;
  }
  if (customer.isError) {
    return <p className="text-sm text-red-600">Unable to load settings.</p>;
  }

  return (
    <div className="max-w-3xl">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-700">
        Settings
      </p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
        Account settings
      </h2>
      <p className="mt-2 text-zinc-600">
        Update your personal details and account password.
      </p>

      <ProfileForm tenantSlug={tenantSlug} customer={customer.data} />
      <PasswordForm tenantSlug={tenantSlug} />

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="font-semibold text-zinc-950">Log out</h3>
        <p className="mt-1 text-sm text-zinc-600">
          Sign out of your customer account on this device.
        </p>
        <Button
          variant="outline"
          className="mt-5 h-10 border-red-200 px-4 text-red-700 hover:bg-red-50 hover:text-red-800"
          onClick={() => void auth.logout()}
        >
          Log out
        </Button>
      </section>
    </div>
  );
}

function ProfileForm({
  tenantSlug,
  customer,
}: {
  tenantSlug: string;
  customer: { name: string; email: string };
}) {
  const updateProfile = useUpdateCustomerProfile(tenantSlug);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: customer.name, email: customer.email },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await updateProfile.mutateAsync(values);
    } catch (error) {
      setError("root", {
        message: getApiErrorMessage(error, "Unable to update your profile."),
      });
    }
  });

  return (
    <SettingsSection
      title="Profile"
      description="The contact details associated with your account."
    >
      <form onSubmit={submit}>
        <FieldGroup>
          <FormInput
            id="customer-name"
            label="Full name"
            autoComplete="name"
            error={errors.name}
            {...register("name")}
          />
          <FormInput
            id="customer-settings-email"
            label="Email address"
            type="email"
            autoComplete="email"
            error={errors.email}
            {...register("email")}
          />
          <FieldError>{errors.root?.message}</FieldError>
          {updateProfile.isSuccess ? (
            <p className="text-sm font-medium text-emerald-700">Profile saved.</p>
          ) : null}
          <Button
            className="h-10 w-fit px-5"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Saving…" : "Save profile"}
          </Button>
        </FieldGroup>
      </form>
    </SettingsSection>
  );
}

function PasswordForm({ tenantSlug }: { tenantSlug: string }) {
  const changePassword = useChangeCustomerPassword(tenantSlug);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const submit = handleSubmit(async ({ currentPassword, newPassword }) => {
    try {
      await changePassword.mutateAsync({
        current_password: currentPassword,
        new_password: newPassword,
      });
      reset();
    } catch (error) {
      setError("root", {
        message: getApiErrorMessage(error, "Unable to change your password."),
      });
    }
  });

  return (
    <SettingsSection
      title="Password"
      description="Use your current password to choose a new one."
    >
      <form onSubmit={submit}>
        <FieldGroup>
          <FormInput
            id="current-password"
            label="Current password"
            type="password"
            autoComplete="current-password"
            error={errors.currentPassword}
            {...register("currentPassword")}
          />
          <FormInput
            id="new-password"
            label="New password"
            type="password"
            autoComplete="new-password"
            error={errors.newPassword}
            {...register("newPassword")}
          />
          <FormInput
            id="confirm-new-password"
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword}
            {...register("confirmPassword")}
          />
          <FieldError>{errors.root?.message}</FieldError>
          {changePassword.isSuccess ? (
            <p className="text-sm font-medium text-emerald-700">
              Password changed.
            </p>
          ) : null}
          <Button
            className="h-10 w-fit px-5"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Changing…" : "Change password"}
          </Button>
        </FieldGroup>
      </form>
    </SettingsSection>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h3 className="font-semibold text-zinc-950">{title}</h3>
      <p className="mb-6 mt-1 text-sm text-zinc-600">{description}</p>
      {children}
    </section>
  );
}
