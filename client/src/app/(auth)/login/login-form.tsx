"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormInput } from "@/components/ui/form-input";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { useAuth } from "@/hooks/use-auth";
import { useTenantLogin } from "@/hooks/use-tenant-login";
import { getApiErrorMessage } from "@/lib/api-client";

const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm({
  tenantSlug,
}: {
  tenantSlug: string | null;
}) {
  const router = useRouter();
  const platformAuth = useAuth();
  const tenantLogin = useTenantLogin(tenantSlug ?? "");
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const submitLogin = handleSubmit(async ({ email, password }) => {
    try {
      if (tenantSlug) {
        const result = await tenantLogin.mutateAsync({ email, password });
        router.replace(
          result.account_type === "platform" ? "/admin" : "/account",
        );
      } else {
        await platformAuth.login({ email, password });
        router.replace("/admin");
      }
    } catch (error) {
      setError("root", {
        message: getApiErrorMessage(
          error,
          "Unable to log in. Please try again.",
        ),
      });
    }
  });

  return (
    <>
      <form className="mt-8" onSubmit={submitLogin}>
        <FieldGroup>
          <FormInput
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email}
            {...register("email")}
          />

          <FormInput
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password}
            {...register("password")}
          />

          <FieldError>{errors.root?.message}</FieldError>

          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Logging in…" : "Log in"}
          </Button>
        </FieldGroup>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Need an account?{" "}
        <Link
          className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
          href="/signup"
        >
          Sign up
        </Link>
      </p>
    </>
  );
}
