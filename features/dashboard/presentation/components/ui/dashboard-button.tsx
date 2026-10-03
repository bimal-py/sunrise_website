"use client";

import Link from "next/link";
import { useContext, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { FormPendingContext } from "@/shared/hooks/use-keep-values-submit";
import { dashboardButtonClass, type DashboardButtonVariant } from "./button-classes";
import { ConfirmDialog } from "./modal";
import { useProgressWhile } from "./use-progress-while";

export type DashboardButtonConfirm = {
  title: string;
  message?: ReactNode;
  /** The confirm button's label. Defaults to the button's own text ("Delete"). */
  confirmLabel?: string;
  /** Shown on the confirm button while the form is sending. Default "Deleting…" (danger) or "Working…". */
  pendingLabel?: string;
};

type DashboardButtonProps = {
  children: ReactNode;
  variant?: DashboardButtonVariant;
  /** Renders a link. Internal paths use next/link; http(s) addresses open in a new tab. */
  href?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  /** Work started by onClick is running: spinner, disabled, and the top bar. (Submits track their form themselves.) */
  pending?: boolean;
  /** A plain <a> to another site (new tab unless newTab is false). */
  external?: boolean;
  /** Open the link in a new tab (e.g. "Preview" of the public page). */
  newTab?: boolean;
  /** Set false for links whose GET has a side effect. */
  prefetch?: boolean;
  /** Ask first: clicking opens a confirmation, and the form is sent (or onClick runs) only on confirm. */
  confirm?: DashboardButtonConfirm;
  name?: string;
  value?: string;
  title?: string;
  "aria-label"?: string;
  className?: string;
};

type Phase = "idle" | "asking" | "sent" | "running";

/**
 * The portfolio dashboard's secondary (ghost) and destructive (danger) button: 38px,
 * bordered, gold or red on hover. As a submit inside a server-action form it shows a spinner,
 * disables itself and runs the gold top bar while the form is sending. With `confirm` it asks
 * in a dialog first and keeps that dialog open, spinning, until the work is done.
 */
export function DashboardButton({
  children,
  variant = "ghost",
  href,
  type = "button",
  onClick,
  disabled,
  pending: pendingProp = false,
  external,
  newTab,
  prefetch,
  confirm,
  name,
  value,
  title,
  "aria-label": ariaLabel,
  className = "",
}: DashboardButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { pending: formPending } = useFormStatus();
  const keptValuesPending = useContext(FormPendingContext);
  const submitting = type === "submit" && (formPending || keptValuesPending);
  const busy = submitting || pendingProp;
  useProgressWhile(busy);

  // The confirmation's life: asking → sent (form submitted) → running (form pending) → closed when it finishes.
  const [phase, setPhase] = useState<Phase>("idle");
  if (phase === "sent" && submitting) setPhase("running");
  if (phase === "running" && !submitting) setPhase("idle");

  const cls = dashboardButtonClass(variant, className);

  if (href) {
    if (disabled) {
      return (
        <span aria-disabled="true" title={title} className={`${cls} cursor-not-allowed opacity-60`}>
          {children}
        </span>
      );
    }
    const offSite = external || /^https?:\/\//.test(href);
    const openNew = newTab ?? offSite;
    const tab = openNew ? { target: "_blank", rel: "noopener noreferrer" } : {};
    return offSite ? (
      <a href={href} title={title} aria-label={ariaLabel} className={cls} {...tab}>
        {children}
      </a>
    ) : (
      <Link href={href} prefetch={prefetch} title={title} aria-label={ariaLabel} className={cls} {...tab}>
        {children}
      </Link>
    );
  }

  const label = typeof children === "string" ? children : "Confirm";

  const confirmed = () => {
    if (type !== "submit") {
      setPhase("idle");
      onClick?.();
      return;
    }
    const button = buttonRef.current;
    const form = button?.form;
    if (!button || !form) return setPhase("idle");
    // requestSubmit dispatches "submit" synchronously when the form is valid; if it didn't, close and let the browser point at the problem.
    let submitted = false;
    const mark = () => {
      submitted = true;
    };
    form.addEventListener("submit", mark, { once: true });
    form.requestSubmit(button);
    form.removeEventListener("submit", mark);
    setPhase(submitted ? "sent" : "idle");
  };

  return (
    <>
      <button
        ref={buttonRef}
        type={type}
        name={name}
        value={value}
        title={title}
        aria-label={ariaLabel}
        aria-busy={busy || undefined}
        disabled={disabled || busy}
        onClick={(event) => {
          if (confirm) {
            event.preventDefault();
            setPhase("asking");
            return;
          }
          onClick?.();
        }}
        className={cls}
      >
        {busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null}
        {children}
      </button>
      {confirm ? (
        <ConfirmDialog
          open={phase !== "idle"}
          onClose={() => setPhase("idle")}
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel ?? label}
          pendingLabel={confirm.pendingLabel}
          danger={variant === "danger"}
          pending={phase === "sent" || phase === "running"}
          onConfirm={confirmed}
        />
      ) : null}
    </>
  );
}
