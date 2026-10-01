"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "@/features/dashboard/presentation/actions/auth";
import { inputClass, labelClass } from "./ui";
import { SubmitButton } from "./form-controls";

export function LoginForm({ next, denied }: { next?: string; denied?: boolean }) {
  const [state, action] = useActionState(signIn, denied ? { error: "That account doesn't have access to the dashboard." } : ({} as SignInState));
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label htmlFor="login-email" className={labelClass}>
          Email
        </label>
        <input id="login-email" name="email" type="email" autoComplete="username" required defaultValue={state.email} className={inputClass} />
      </div>
      <div>
        <label htmlFor="login-password" className={labelClass}>
          Password
        </label>
        <input id="login-password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-error">
          {state.error}
        </p>
      )}
      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
    </form>
  );
}
