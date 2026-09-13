"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { FormInput } from "@/components/ui/form-input";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { getApiErrorMessage } from "@/lib/api-client";

const schema = z
  .object({
    email: z.email("Enter a valid email address."),
    password: z.string().min(8, "Password must contain at least 8 characters."),
    passwordConfirmation: z.string(),
  })
  .refine(({ password, passwordConfirmation }) => password === passwordConfirmation, {
    message: "Passwords do not match.",
    path: ["passwordConfirmation"],
  });

type Values = z.infer<typeof schema>;

export function CustomerSignupForm({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter();
  const auth = useCustomerAuth(tenantSlug);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", passwordConfirmation: "" },
  });

  const submit = handleSubmit(async ({ email, password }) => {
    try {
      await auth.signup({ email, password });
      await auth.login({ email, password });
      router.replace("/account");
    } catch (error) {
      setError("root", {
        message: getApiErrorMessage(error, "Unable to create your account."),
      });
    }
  });

  return (
    <form className="mt-8" onSubmit={submit}>
      <FieldGroup>
        <FormInput
          id="customer-email"
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email}
          {...register("email")}
        />
        <FormInput
          id="customer-password"
          label="Password"
          type="password"
          autoComplete="new-password"
          error={errors.password}
          {...register("password")}
        />
        <FormInput
          id="customer-password-confirmation"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          error={errors.passwordConfirmation}
          {...register("passwordConfirmation")}
        />
        <FieldError>{errors.root?.message}</FieldError>
        <Button className="w-full" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating account…" : "Create customer account"}
        </Button>
      </FieldGroup>
    </form>
  );
}
