"use client";

import { useActionState, type ReactNode } from "react";
import { FormPendingContext, keepValuesOnSubmit } from "@/shared/hooks/use-keep-values-submit";
import { idle, type ActionState } from "./action-state";
import { DashboardSubmitButton } from "./dashboard-submit-button";
import { FormStatus } from "./form-status";

/**
 * An editor form in the portfolio's form card: fields 20px apart (put two or three side by
 * side with `<div className="grid gap-5 md:grid-cols-2">`), the gold save button last, and
 * the action's message beside it. A failed save keeps everything typed in place and says why
 * in red; a successful one usually redirects (back to the list, with ?saved=<label>), or
 * returns a success message for forms that stay on the page.
 */
export function DashboardForm({
  action,
  submitLabel,
  pendingLabel = "Saving…",
  children,
  footer,
  className = "",
  id,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  pendingLabel?: string;
  children: ReactNode;
  /** Extra buttons beside the save button (e.g. a Cancel link). */
  footer?: ReactNode;
  className?: string;
  id?: string;
}) {
  const [state, formAction, pending] = useActionState(action, idle);
  return (
    <div className={`min-w-0 rounded-panel border border-line bg-surface p-6 sm:p-8 ${className}`}>
      <FormPendingContext value={pending}>
        <form id={id} action={formAction} onSubmit={keepValuesOnSubmit(formAction)} className="grid min-w-0 gap-5">
          {children}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 pt-1">
            <DashboardSubmitButton pendingLabel={pendingLabel}>{submitLabel}</DashboardSubmitButton>
            {footer}
            <FormStatus state={state} />
          </div>
        </form>
      </FormPendingContext>
    </div>
  );
}
