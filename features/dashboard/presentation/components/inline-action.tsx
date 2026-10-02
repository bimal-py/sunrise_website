"use client";

import { useActionState, type ReactNode } from "react";
import { FormStatus, idle, SubmitButton, type ActionState } from "./form-controls";

/** One button bound to a server action, with its result beside it ("Sync from YouTube"). */
export function InlineAction({
  action,
  label,
  pendingLabel,
  variant = "secondary",
  children,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  label: string;
  pendingLabel: string;
  variant?: "primary" | "secondary";
  children?: ReactNode;
}) {
  const [state, formAction] = useActionState(action, idle);
  return (
    <form action={formAction} className="flex flex-col items-start gap-2 sm:items-end">
      {children}
      <SubmitButton variant={variant} pendingLabel={pendingLabel}>
        {label}
      </SubmitButton>
      <div className="max-w-sm sm:text-right">
        <FormStatus state={state} />
      </div>
    </form>
  );
}
