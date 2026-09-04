"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { getApiErrorMessage } from "@/app/app.service";
import { FormInput } from "@/components/ui/form-input";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { useAuth } from "@/hooks/use-auth";

const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { login, logout, status } = useAuth();
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
      await login({ email, password });
    } catch (error) {
      setError("root", {
        message: getApiErrorMessage(
          error,
          "Unable to log in. Please try again.",
        ),
      });
    }
  });

  if (status === "loading") {
    return (
      <p className="mt-8 text-sm text-zinc-600" role="status">
        Checking your session…
      </p>
    );
  }

  if (status === "authenticated") {
    return (
      <div className="mt-8">
        <p
          className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
          role="status"
        >
          You are logged in.
        </p>
        <Button
          className="mt-4 w-full"
          variant="outline"
          type="button"
          onClick={() => void logout()}
        >
          Log out
        </Button>
      </div>
    );
  }

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

      <p className="mt-6 text-center text-sm text-zinc-600">
        Need an account?{" "}
        <Link className="font-medium text-zinc-950 underline" href="/signup">
          Sign up
        </Link>
      </p>
    </>
  );
}
