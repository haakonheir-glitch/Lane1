"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { login, signup, type AuthState } from "@/app/actions/auth";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? login : signup, undefined);
  const isSignup = mode === "signup";

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {isSignup ? (
        <Field label="Name" htmlFor="name" hint="Appears on your report. First name is enough.">
          <Input id="name" name="name" autoComplete="given-name" required defaultValue={state?.fields?.name} />
        </Field>
      ) : null}
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.fields?.email} />
      </Field>
      <Field label="Password" htmlFor="password" hint={isSignup ? "At least 10 characters." : undefined}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          required
          minLength={isSignup ? 10 : undefined}
        />
      </Field>

      <p role="alert" aria-live="assertive" className="min-h-5 text-small text-caution">
        {state?.error ?? ""}
      </p>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "…" : isSignup ? "Create account" : "Sign in"}
      </Button>

      <p className="text-small text-ink-3">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/signup" className="text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
