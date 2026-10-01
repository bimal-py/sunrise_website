"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { SpriteButton } from "@/shared/components/ui/sprite-button";

/** What every dashboard server action returns to its form. */
export type ActionState = { status: "idle" | "success" | "error"; message?: string; fieldErrors?: Record<string, string> };
export const idle: ActionState = { status: "idle" };

/** The form's submit: a SpriteButton that dims and says so while saving. */
export function SubmitButton({ children = "Save", pendingLabel = "Saving…", variant = "primary", name, value }: { children?: ReactNode; pendingLabel?: string; variant?: "primary" | "secondary"; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  return (
    <SpriteButton type="submit" variant={variant} disabled={pending} name={name} value={value}>
      {pending ? pendingLabel : children}
    </SpriteButton>
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
