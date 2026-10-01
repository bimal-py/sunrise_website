"use client";

import { useActionState, type ReactNode } from "react";
import { FormStatus, idle, SubmitButton, type ActionState } from "./form-controls";

/** A form bound to a server action, with the save button and its status line. Fields are passed as children. */
export function ActionForm({
  action,
  children,
  submitLabel = "Save",
  className = "",
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  submitLabel?: string;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, idle);
  return (
    <form action={formAction} className={`flex flex-col gap-5 ${className}`}>
      {children}
      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-5">
        <SubmitButton>{submitLabel}</SubmitButton>
        <FormStatus state={state} />
      </div>
    </form>
  );
}
