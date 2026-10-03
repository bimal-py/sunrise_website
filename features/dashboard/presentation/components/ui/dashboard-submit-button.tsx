"use client";

import { useContext, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { FormPendingContext } from "@/shared/hooks/use-keep-values-submit";
import { SpriteButton } from "@/shared/components/ui/sprite-button";
import { useProgressWhile } from "./use-progress-while";

/**
 * A form's main button (Save, Create, Sign in): the gold SpriteButton. While the form is
 * sending it shows a spinner and `pendingLabel` ("Saving…"), can't be pressed again, and runs
 * the gold top bar. Works in plain server-action forms (useFormStatus) and in forms that keep
 * their values on a failed save (FormPendingContext, e.g. DashboardForm). `secondary` is the
 * outlined SpriteButton (Sign out).
 */
export function DashboardSubmitButton({
  children,
  pendingLabel = "Saving…",
  name,
  value,
  variant = "primary",
  disabled,
  className,
}: {
  children: ReactNode;
  pendingLabel?: string;
  name?: string;
  value?: string;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  className?: string;
}) {
  const { pending: formPending } = useFormStatus();
  const keptValuesPending = useContext(FormPendingContext);
  const pending = formPending || keptValuesPending;
  useProgressWhile(pending);
  return (
    <SpriteButton type="submit" variant={variant} disabled={disabled || pending} name={name} value={value} className={className}>
      {pending ? (
        <>
          <Loader2 size={15} className="animate-spin" aria-hidden />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </SpriteButton>
  );
}
