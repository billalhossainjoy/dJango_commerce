"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { FormInput } from "@/components/ui/form-input";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { getApiErrorMessage } from "@/lib/api-client";

const signupSchema = z
  .object({
    storeName: z.string().trim().min(1, "Store name is required."),
    slug: z
      .string()
      .min(1, "Store URL is required.")
      .max(63, "Store URL must contain at most 63 characters.")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Use only letters, numbers, and single hyphens between words. Spaces and symbols such as . @ # are not allowed.",
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

function getPlatformLoginUrl(): string {
  const rootDomain = process.env.NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN;
  if (!rootDomain) {
    throw new Error("The platform root domain is not configured.");
  }

  const port = window.location.port ? `:${window.location.port}` : "";
  return `${window.location.protocol}//${rootDomain}${port}/login`;
}

export function SignupForm() {
  const { signup } = useAuth();
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
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

  const slug = useWatch({ control, name: "slug" }).trim();
  const rootDomain = process.env.NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN;

  const submitSignup = handleSubmit(async (values) => {
    try {
      await signup(values);
      window.location.assign(getPlatformLoginUrl());
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

        <Field data-invalid={!!errors.slug}>
          <FieldLabel htmlFor="store-slug">Store URL</FieldLabel>
          <div className="flex min-w-0 items-stretch">
            <Input
              id="store-slug"
              className={rootDomain ? "relative z-10 rounded-r-none" : undefined}
              type="text"
              placeholder="storename"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={63}
              aria-invalid={!!errors.slug}
              aria-describedby={`store-url-preview${errors.slug ? " store-slug-error" : ""}`}
              {...register("slug", {
                onChange: (event) => {
                  event.target.value = event.target.value.toLowerCase();
                  setValue("slug", event.target.value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                },
              })}
            />
            {rootDomain ? (
              <span className="flex shrink-0 items-center whitespace-nowrap rounded-r-md border border-l-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                .{rootDomain}
              </span>
            ) : null}
          </div>
          <FieldDescription id="store-url-preview" className="break-words" aria-live="polite">
            {rootDomain ? (
              <>Your store URL: <span className="font-medium text-foreground">{slug || "storename"}.{rootDomain}</span></>
            ) : (
              "Your store address will use the platform domain."
            )}
          </FieldDescription>
          <FieldError id="store-slug-error" errors={[errors.slug]} />
        </Field>

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
