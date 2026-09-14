"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { apiRequest, getApiErrorMessage } from "@/lib/api-client";

type Mode = "verify" | "forgot" | "reset";

export function AccountEmailForm({
  mode,
  tenantSlug,
  uid,
  token,
}: {
  mode: Mode;
  tenantSlug: string | null;
  uid?: string;
  token?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [formError, setFormError] = useState("");
  const hasLink = Boolean(uid && token);
  const base = tenantSlug
    ? `/api/v1/tenants/${encodeURIComponent(tenantSlug)}/auth/`
    : "/api/v1/auth/";
  const mutation = useMutation({
    mutationFn: () => {
      const path =
        mode === "forgot"
          ? "password/reset/"
          : mode === "reset"
            ? "password/reset/confirm/"
            : hasLink
              ? "email/verify/"
              : "email/verification/";
      const body =
        mode === "reset"
          ? { uid, token, new_password: password }
          : mode === "verify" && hasLink
            ? { uid, token }
            : { email };
      return apiRequest<{ detail: string }>(`${base}${path}`, {
        method: "POST",
        body,
      });
    },
    onSuccess: () => {
      setPassword("");
      setConfirmation("");
      if (hasLink)
        window.history.replaceState(null, "", window.location.pathname);
    },
  });
  const completed = mutation.isSuccess;
  const title =
    mode === "forgot"
      ? "Forgot your password?"
      : mode === "reset"
        ? "Choose a new password"
        : hasLink
          ? "Verify your email"
          : "Check your email";
  const description =
    mode === "forgot"
      ? "Enter your account email and we’ll send you a link to reset your password."
      : mode === "reset"
        ? "Use a strong password that you don’t use for other accounts."
        : hasLink
          ? "Confirm your email address to finish setting up your account."
          : "We’ve requested a verification email for your new account. Check your inbox and spam folder. Need another link? Enter your email below.";
  const invalidReset = mode === "reset" && !hasLink;
  return (
    <div>
      <h1 className="mt-4 text-2xl font-semibold">
        {completed
          ? mode === "reset"
            ? "Password updated"
            : mode === "verify" && hasLink
              ? "Email verified"
              : "Check your inbox"
          : title}
      </h1>
      {completed ? (
        <p
          className="mt-4 rounded-lg bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-800"
          role="status"
        >
          {mutation.data.detail}
        </p>
      ) : invalidReset ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          This reset link is incomplete. Request a new one below.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
          <form
            className="mt-6 space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              setFormError("");
              if (mode === "reset" && password !== confirmation) {
                setFormError("Passwords do not match.");
                return;
              }
              mutation.mutate();
            }}
          >
            {mode === "forgot" || (mode === "verify" && !hasLink) ? (
              <div>
                <label htmlFor="recovery-email" className="text-sm font-medium">
                  Email address
                </label>
                <input
                  id="recovery-email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 block h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary"
                />
              </div>
            ) : null}
            {mode === "reset" ? (
              <>
                <div>
                  <label
                    htmlFor="reset-password"
                    className="text-sm font-medium"
                  >
                    New password
                  </label>
                  <input
                    id="reset-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-2 block h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary"
                  />
                </div>
                <div>
                  <label
                    htmlFor="confirm-reset-password"
                    className="text-sm font-medium"
                  >
                    Confirm new password
                  </label>
                  <input
                    id="confirm-reset-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    className="mt-2 block h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary"
                  />
                </div>
              </>
            ) : null}
            {formError || mutation.isError ? (
              <p className="text-sm text-destructive" role="alert">
                {formError ||
                  getApiErrorMessage(
                    mutation.error,
                    "Unable to complete this request. Please try again.",
                  )}
              </p>
            ) : null}
            <Button
              type="submit"
              className="h-10 w-full"
              disabled={mutation.isPending}
            >
              {mutation.isPending
                ? "Please wait…"
                : mode === "forgot"
                  ? "Send reset link"
                  : mode === "reset"
                    ? "Reset password"
                    : hasLink
                      ? "Verify email address"
                      : "Resend verification email"}
            </Button>
          </form>
        </>
      )}
      <div className="mt-6 space-y-3 text-center text-sm">
        {/* A full navigation clears any in-memory session after a password reset. */}
        <a
          href="/login"
          className="block font-medium text-primary underline underline-offset-4"
        >
          Back to sign in
        </a>
        {mode === "reset" ? (
          <Link
            href="/forgot-password"
            className="block text-muted-foreground underline underline-offset-4"
          >
            Request a new reset link
          </Link>
        ) : mode === "verify" && hasLink ? (
          <Link
            href="/verify-email"
            className="block text-muted-foreground underline underline-offset-4"
          >
            Request a new verification link
          </Link>
        ) : null}
        {mode === "reset" && completed ? (
          <Link
            href="/verify-email"
            className="block text-muted-foreground underline underline-offset-4"
          >
            Still need to verify your email?
          </Link>
        ) : null}
      </div>
    </div>
  );
}
