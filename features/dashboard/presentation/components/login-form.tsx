"use client";

import { useActionState } from "react";
import { FormPendingContext, keepValuesOnSubmit } from "@/shared/hooks/use-keep-values-submit";
import { signIn, type SignInState } from "@/features/dashboard/presentation/actions/auth";
import { DashboardField, DashboardInput } from "./ui/dashboard-ui";
import { DashboardSubmitButton } from "./ui/dashboard-submit-button";

/**
 * The portfolio's sign-in form on this site's server action (signIn checks the admin list
 * and only returns to dashboard pages). What was typed stays put when it fails; the reason
 * appears beside the button.
 */
export function LoginForm({ next, denied }: { next?: string; denied?: boolean }) {
  const [state, action, pending] = useActionState(signIn, denied ? { error: "That account doesn't have access to the dashboard." } : ({} as SignInState));
  return (
    <FormPendingContext value={pending}>
      <form action={action} onSubmit={keepValuesOnSubmit(action)} className="space-y-5">
        <input type="hidden" name="next" value={next ?? ""} />
        <DashboardField label="Email">
          <DashboardInput name="email" type="email" autoComplete="username" required defaultValue={state.email} placeholder="you@example.com" />
        </DashboardField>
        <DashboardField label="Password">
          <DashboardInput name="password" type="password" autoComplete="current-password" required placeholder="Your password" />
        </DashboardField>
        <div className="flex flex-wrap items-center gap-4 pt-1">
          <DashboardSubmitButton pendingLabel="Signing in…">Sign in</DashboardSubmitButton>
          {state.error ? (
            <p role="alert" className="text-sm text-error">
              {state.error}
            </p>
          ) : null}
        </div>
      </form>
    </FormPendingContext>
  );
}
