"use client";

import { useId, useLayoutEffect, useRef, useState, type ReactNode, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import { CircleHelp, Loader2, Trash2, X } from "lucide-react";
import { SpriteButton } from "@/shared/components/ui/sprite-button";
import { dashboardButtonClass } from "./button-classes";
import { DashboardField, DashboardInput } from "./dashboard-ui";
import { useProgressWhile } from "./use-progress-while";

export type ModalSize = "sm" | "md" | "lg" | "xl";

/** sm = the portfolio's confirm/form dialogs, lg = its file picker. */
const WIDTHS: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

// Nested dialogs (a picker opening an upload dialog) share one scroll lock.
let scrollLocks = 0;
let savedOverflow = "";
function lockScroll() {
  if (scrollLocks++ === 0) {
    savedOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
  }
}
function unlockScroll() {
  if (scrollLocks > 0 && --scrollLocks === 0) document.documentElement.style.overflow = savedOverflow;
}

/** Keeps clicks, keys and submits inside the dialog from reaching its parents in the React tree (portals bubble there). */
const stop = (event: SyntheticEvent) => event.stopPropagation();

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  size?: ModalSize;
  children?: ReactNode;
  /** Buttons along the bottom, right-aligned (centred in a centred dialog). */
  footer?: ReactNode;
  /** False while something is running: Esc, the backdrop and × then leave it open. */
  dismissible?: boolean;
  /** "center" for confirmations: icon, title and message centred, no × button. */
  align?: "start" | "center";
  /** A centred dialog's icon circle. */
  icon?: ReactNode;
  /** Extra classes for the panel, e.g. "flex max-h-[85vh] flex-col" for a picker with its own scrolling list. */
  className?: string;
};

/**
 * A centred dialog over a dark scrim, as on the portfolio. Built on the native modal <dialog>:
 * the page behind can't be reached (focus stays inside), Esc closes it, the page doesn't
 * scroll underneath, and focus goes back to whatever opened it. Rendered into <body>, so a
 * dialog opened from inside a form or a <label> keeps its own fields and buttons to itself.
 * Mark the field that should take focus with `autoFocus` or `data-autofocus`.
 */
export function Modal(props: ModalProps) {
  if (!props.open) return null;
  return <ModalDialog {...props} />;
}

function ModalDialog({ onClose, title, description, size = "md", children, footer, dismissible = true, align = "start", icon, className = "" }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const pressedBackdrop = useRef(false);
  const titleId = useId();
  const descriptionId = useId();
  // Whatever had focus when the dialog opened (read before any autoFocus inside it runs), to return to on close.
  const [returnFocus] = useState(() => (typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null)));
  const latest = useRef({ onClose, dismissible });
  useLayoutEffect(() => {
    latest.current = { onClose, dismissible };
  });

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // Rendered with `open` so an autoFocus field inside could take focus; now make it modal and keep that focus.
    const focused = document.activeElement;
    if (dialog.open) dialog.close();
    dialog.showModal();
    if (focused instanceof HTMLElement && focused !== document.body && dialog.contains(focused)) focused.focus();
    else dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    lockScroll();
    return () => {
      unlockScroll();
      if (dialog.open) dialog.close();
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    };
  }, [returnFocus]);

  if (typeof document === "undefined") return null;
  const centred = align === "center";
  const isBackdrop = (target: EventTarget | null) => target === dialogRef.current || target === frameRef.current;

  return createPortal(
    <dialog
      ref={dialogRef}
      open
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (latest.current.dismissible) latest.current.onClose();
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
        pressedBackdrop.current = isBackdrop(event.target);
      }}
      onClick={(event) => {
        event.stopPropagation();
        // Only a click that also started on the scrim closes it (not a text selection dragged out of a field).
        if (pressedBackdrop.current && isBackdrop(event.target) && dismissible) onClose();
        pressedBackdrop.current = false;
      }}
      onMouseDown={stop}
      onKeyDown={stop}
      onKeyUp={stop}
      onSubmit={stop}
      onChange={stop}
      onInput={stop}
      onFocus={stop}
      onBlur={stop}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-y-auto overscroll-contain bg-transparent p-0 text-foreground backdrop:top-[2px] backdrop:bg-black/70"
    >
      {/* The scrim leaves the top 2px clear, so the gold progress bar stays visible while a dialog's action runs. */}
      <div ref={frameRef} className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div className={`relative w-full min-w-0 ${WIDTHS[size]} rounded-panel border border-line bg-surface p-6 ${centred ? "text-center" : ""} ${className}`}>
          {centred ? (
            <>
              {icon}
              <h2 id={titleId} className="font-sans text-xl font-semibold leading-snug text-strong">
                {title}
              </h2>
              {description ? (
                <div id={descriptionId} className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
                  {description}
                </div>
              ) : null}
            </>
          ) : (
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 id={titleId} className="font-sans text-xl font-semibold leading-snug text-strong">
                  {title}
                </h2>
                {description ? (
                  <div id={descriptionId} className="mt-1 text-sm leading-6 text-muted">
                    {description}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismissible && onClose()}
                disabled={!dismissible}
                aria-label="Close"
                className="-mr-2 -mt-2 inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-150 hover:text-strong disabled:cursor-not-allowed disabled:opacity-40"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
          )}
          {children}
          {footer ? <div className={`mt-6 flex flex-wrap items-center gap-3 ${centred ? "justify-center" : "justify-end"}`}>{footer}</div> : null}
        </div>
      </div>
    </dialog>,
    document.body,
  );
}

/** The spinner + label a busy button shows. */
function Busy({ label }: { label: string }) {
  return (
    <>
      <Loader2 size={15} className="animate-spin" aria-hidden />
      {label}
    </>
  );
}

/**
 * "Are you sure?", as on the portfolio: an icon in a tinted circle (red for `danger`), the
 * question, Cancel and the gold confirm button. It stays open with a spinner while `pending`
 * (the caller closes it when the work is done), and Cancel starts focused.
 */
export function ConfirmDialog({
  open,
  onClose,
  title,
  message,
  confirmLabel,
  danger = false,
  pending = false,
  pendingLabel,
  onConfirm,
  icon,
  cancelLabel = "Cancel",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  message?: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  pending?: boolean;
  /** Default "Deleting…" for danger, else "Working…". */
  pendingLabel?: string;
  onConfirm: () => void;
  icon?: ReactNode;
  cancelLabel?: string;
}) {
  useProgressWhile(open && pending);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={message}
      size="sm"
      align="center"
      dismissible={!pending}
      icon={
        <span aria-hidden className={`mx-auto mb-4 flex size-12 items-center justify-center rounded-full ${danger ? "bg-error/10 text-error" : "bg-primary-soft text-primary"}`}>
          {icon ?? (danger ? <Trash2 size={20} /> : <CircleHelp size={20} />)}
        </span>
      }
      footer={
        <>
          <button type="button" data-autofocus onClick={onClose} disabled={pending} className={dashboardButtonClass("ghost")}>
            {cancelLabel}
          </button>
          <SpriteButton type="button" onClick={onConfirm} disabled={pending}>
            {pending ? <Busy label={pendingLabel ?? (danger ? "Deleting…" : "Working…")} /> : confirmLabel}
          </SpriteButton>
        </>
      }
    />
  );
}

type FormDialogProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  /** The one field's label ("Folder name", "New name"). */
  label: string;
  placeholder?: string;
  defaultValue?: string;
  hint?: ReactNode;
  submitLabel: string;
  pending?: boolean;
  pendingLabel?: string;
  /** What went wrong last time, shown under the field. */
  error?: string;
  maxLength?: number;
  /** Called with the trimmed value (never empty). */
  onSubmit: (value: string) => void;
};

/**
 * A one-field dialog, as on the portfolio's file manager (New folder, Rename): the field
 * starts focused with its text selected, Enter saves, an empty value is refused inline, and
 * it stays open with a spinner while `pending`.
 */
export function FormDialog({ open, onClose, title, description, ...body }: FormDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description} size="sm" dismissible={!body.pending}>
      <FormDialogBody onClose={onClose} {...body} />
    </Modal>
  );
}

function FormDialogBody({
  onClose,
  label,
  placeholder,
  defaultValue = "",
  hint,
  submitLabel,
  pending = false,
  pendingLabel = "Saving…",
  error,
  maxLength,
  onSubmit,
}: Omit<FormDialogProps, "open" | "title" | "description">) {
  const [value, setValue] = useState(defaultValue);
  const [empty, setEmpty] = useState(false);
  useProgressWhile(pending);
  const problem = empty ? "This can't be empty." : error;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        const trimmed = value.trim();
        if (!trimmed) return setEmpty(true);
        onSubmit(trimmed);
      }}
      className="grid gap-5"
    >
      <DashboardField label={label} hint={hint} error={problem}>
        <DashboardInput
          data-autofocus
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setEmpty(false);
          }}
          onFocus={(event) => event.currentTarget.select()}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={pending}
          aria-invalid={problem ? true : undefined}
          autoComplete="off"
        />
      </DashboardField>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button type="button" onClick={onClose} disabled={pending} className={dashboardButtonClass("ghost")}>
          Cancel
        </button>
        <SpriteButton type="submit" disabled={pending}>
          {pending ? <Busy label={pendingLabel} /> : submitLabel}
        </SpriteButton>
      </div>
    </form>
  );
}
