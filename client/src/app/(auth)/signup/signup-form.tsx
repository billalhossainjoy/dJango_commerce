"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { getApiErrorMessage } from "@/app/app.service";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { FormInput } from "@/components/ui/form-input";
import { useAuth } from "@/hooks/use-auth";

const signupSchema = z
  .object({
    email: z.email("Enter a valid email address."),
    password: z.string().min(8, "Password must contain at least 8 characters."),
    passwordConfirm: z.string(),
  })
  .refine(({ password, passwordConfirm }) => password === passwordConfirm, {
    message: "Passwords do not match.",
    path: ["passwordConfirm"],
  });

type SignupValues = z.infer<typeof signupSchema>;

export function SignupForm() {
  const { signup } = useAuth();
  const [isComplete, setIsComplete] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "", passwordConfirm: "" },
  });

  const submitSignup = handleSubmit(async (values) => {
    try {
      await signup(values);
      reset();
      setIsComplete(true);
    } catch (error) {
      setError("root", {
        message: getApiErrorMessage(
          error,
          "Unable to create your account. Please try again.",
        ),
      });
    }
  });

  if (isComplete) {
    return (
      <div
        className="mt-8 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
        role="status"
      >
        Your account was created successfully. You can now log in.
      </div>
    );
  }

  return (
    <form className="mt-8" onSubmit={submitSignup}>
      <FieldGroup>
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
