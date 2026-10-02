"use client";

import { useContext, useEffect, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { doneProgress, startProgress } from "@/shared/components/navigation/progress-store";
import { FormPendingContext } from "@/shared/hooks/use-keep-values-submit";
import { SpriteButton } from "@/shared/components/ui/sprite-button";

/** What every dashboard server action returns to its form. */
export type ActionState = { status: "idle" | "success" | "error"; message?: string; fieldErrors?: Record<string, string> };
export const idle: ActionState = { status: "idle" };

/** Runs the top progress bar while `busy` (a save, a delete, an upload). */
export function useProgressWhile(busy: boolean) {
  useEffect(() => {
    if (!busy) return;
    startProgress();
    return doneProgress;
  }, [busy]);
}

/** The form's submit: a SpriteButton that dims and says so while saving (and runs the top bar). */
export function SubmitButton({ children = "Save", pendingLabel = "Saving…", variant = "primary", name, value }: { children?: ReactNode; pendingLabel?: string; variant?: "primary" | "secondary"; name?: string; value?: string }) {
  const ownPending = useContext(FormPendingContext);
  const pending = useFormStatus().pending || ownPending;
  useProgressWhile(pending);
  return (
    <SpriteButton type="submit" variant={variant} disabled={pending} name={name} value={value}>
      {pending ? pendingLabel : children}
    </SpriteButton>
  );
}

/** A small text-style submit for row actions ("Mark read", "Hide"): shows it's working. */
export function QuietSubmit({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  useProgressWhile(pending);
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex min-h-8 items-center text-sm text-muted underline-offset-4 transition-colors duration-150 hover:text-strong hover:underline disabled:opacity-50 ${className}`}
    >
      {pending ? "Working…" : children}
    </button>
  );
}

/** "Saved" / error line under a form. */
export function FormStatus({ state }: { state: ActionState }) {
  if (state.status === "idle" || !state.message) return null;
  return (
    <p role={state.status === "error" ? "alert" : "status"} className={`text-sm ${state.status === "error" ? "text-error" : "text-success"}`}>
      {state.message}
    </p>
  );
}

/** A destructive submit (delete): quiet red text that asks first. */
export function ConfirmSubmit({ children, confirm, className = "" }: { children: ReactNode; confirm: string; className?: string }) {
  const { pending } = useFormStatus();
  useProgressWhile(pending);
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirm)) event.preventDefault();
      }}
      className={`inline-flex min-h-8 items-center gap-1.5 text-sm font-medium text-error underline-offset-4 transition-opacity duration-150 hover:underline disabled:opacity-50 ${className}`}
    >
      {pending ? "Working…" : children}
    </button>
  );
}
