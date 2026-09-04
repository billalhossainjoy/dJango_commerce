"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { getApiErrorMessage } from "@/app/app.service";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { FormInput } from "@/components/ui/form-input";
import { useAuth } from "@/hooks/use-auth";

const signupSchema = z
  .object({
    storeName: z.string().trim().min(1, "Store name is required."),
    slug: z
      .string()
      .trim()
      .min(1, "Store URL is required.")
      .max(63, "Store URL must contain at most 63 characters.")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Use lowercase letters, numbers, and single hyphens.",
      ),
    email: z.email("Enter a valid email address."),
    password: z.string().min(8, "Password must contain at least 8 characters."),
    passwordConfirm: z.string(),
  })
  .refine(({ password, passwordConfirm }) => password === passwordConfirm, {
    message: "Passwords do not match.",
    path: ["passwordConfirm"],
  });

type SignupValues = z.infer<typeof signupSchema>;

function getTenantLoginUrl(tenantSlug: string): string {
  const rootDomain = process.env.NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN;
  if (!rootDomain) {
    throw new Error("The platform root domain is not configured.");
  }

  const port = window.location.port ? `:${window.location.port}` : "";
  return `${window.location.protocol}//${tenantSlug}.${rootDomain}${port}/login`;
}

export function SignupForm() {
  const { signup } = useAuth();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      storeName: "",
      slug: "",
      email: "",
      password: "",
      passwordConfirm: "",
    },
  });

  const submitSignup = handleSubmit(async (values) => {
    try {
      const result = await signup(values);
      window.location.assign(getTenantLoginUrl(result.tenant.slug));
    } catch (error) {
      setError("root", {
        message: getApiErrorMessage(
          error,
          "Unable to create your account. Please try again.",
        ),
      });
    }
  });

  return (
    <form className="mt-8" onSubmit={submitSignup}>
      <FieldGroup>
        <FormInput
          id="store-name"
          label="Store name"
          type="text"
          autoComplete="organization"
          error={errors.storeName}
          {...register("storeName")}
        />

        <FormInput
          id="store-slug"
          label="Store URL"
          type="text"
          autoComplete="off"
          error={errors.slug}
          {...register("slug")}
        />

        <FormInput
          id="signup-email"
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email}
          {...register("email")}
        />

        <FormInput
          id="signup-password"
          label="Password"
          type="password"
          autoComplete="new-password"
          error={errors.password}
          {...register("password")}
        />

        <FormInput
          id="password-confirm"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          error={errors.passwordConfirm}
          {...register("passwordConfirm")}
        />

        <FieldError>{errors.root?.message}</FieldError>

        <Button className="w-full" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </FieldGroup>
    </form>
  );
}
