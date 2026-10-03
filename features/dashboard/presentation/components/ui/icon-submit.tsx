"use client";

import { useContext, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { FormPendingContext } from "@/shared/hooks/use-keep-values-submit";
import { useProgressWhile } from "./use-progress-while";

/**
 * A square icon button that submits its form: the row tools (move up/down). While the form
 * is sending, every button in it is disabled, the one that was pressed spins, and the gold
 * top bar runs. Give several buttons in one form a shared `name` and their own `value`.
 */
export function IconSubmit({
  label,
  children,
  disabled,
  name,
  value,
  className = "",
}: {
  /** Read out and shown on hover: "Move Weddings up". */
  label: string;
  children: ReactNode;
  disabled?: boolean;
  name?: string;
  value?: string;
  className?: string;
}) {
  const { pending: formPending, data } = useFormStatus();
  const keptValuesPending = useContext(FormPendingContext);
  const busy = formPending || keptValuesPending;
  // Which button sent the form: the one whose name/value went with it (any, when there's no way to tell).
  const pressed = busy && (!name || !data || data.get(name) === value);
  useProgressWhile(pressed);
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={disabled || busy}
      aria-label={label}
      aria-busy={pressed || undefined}
      title={label}
      className={`inline-flex size-[38px] shrink-0 items-center justify-center rounded-control border border-line-strong text-muted transition-colors duration-150 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line-strong disabled:hover:text-muted pointer-coarse:size-11 ${className}`}
    >
      {pressed ? <Loader2 size={15} className="animate-spin" aria-hidden /> : children}
    </button>
  );
}
