import { ChevronDown, CircleAlert, CircleCheck } from "lucide-react";
import { useId, type ComponentPropsWithRef, type ReactNode } from "react";
import { FieldHelp } from "./field-help";

/**
 * The dashboard kit, laid out like the owner's portfolio dashboard and drawn in this site's
 * tokens: plain bordered surfaces (no shadows, gradients or glows), 6/8/10px radii, mono gold
 * labels, neutral inputs that turn gold on focus. Primary actions are SpriteButtons
 * (DashboardSubmitButton for saves); secondary and destructive ones are DashboardButtons.
 * Server-safe: these render on the server or inside client components alike.
 */

/**
 * The shared input look: 42px, neutral fill, gold border on focus, red when aria-invalid.
 * 14px text as on the portfolio; 16px on iPhones and iPads, which zoom into smaller fields.
 */
export const controlClass =
  "w-full rounded-control border border-line-strong bg-raised px-4 py-2.5 text-sm text-strong outline-none transition-colors duration-150 placeholder:text-muted/70 focus:border-primary aria-[invalid=true]:border-error disabled:cursor-not-allowed disabled:opacity-60 supports-[-webkit-touch-callout:none]:text-base file:mr-4 file:cursor-pointer file:rounded-control file:border-0 file:bg-primary-soft file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary";

/** Field labels, captions and small headings: mono, uppercase, gold (11px: the portfolio's look at a legible size). */
export const fieldLabelClass = "font-mono text-[11px] uppercase tracking-[0.16em] text-primary";

/** The eyebrow above a page or card title. */
export const eyebrowClass = "font-mono text-[11px] uppercase tracking-[0.18em] text-primary";

// ── Card: the dashboard's surface. No padding of its own; callers add it (p-4 filters, p-5 tiles, p-5 sm:p-6 rows). ──
export function DashboardCard({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-card border border-line bg-surface ${className}`}>{children}</div>;
}

/** The red "*" after a required field's label (the check itself happens on the server). */
function RequiredMark() {
  return (
    <>
      <sup aria-hidden className="ml-0.5 text-[0.85em] text-error" title="Required">
        *
      </sup>
      <span className="sr-only"> (required)</span>
    </>
  );
}

// ── Field: label + optional "?" help + control + hint or error ──
/**
 * A labelled field, as on the portfolio: the whole field is a <label>, so the label names the
 * control inside without ids. Pass `as="div"` when the children hold several controls (a group
 * of checkboxes, a photo gallery): the caption then names the group instead.
 */
export function DashboardField({
  label,
  htmlFor,
  required,
  help,
  example,
  hint,
  error,
  as = "label",
  className = "",
  children,
}: {
  label: string;
  htmlFor?: string;
  /** Adds a red "*" after the label. */
  required?: boolean;
  /** What the field is for, in the "?" note beside the label. */
  help?: ReactNode;
  /** An example value, added to the note as "e.g. …". */
  example?: string;
  /** A short line under the control. */
  hint?: ReactNode;
  /** Shown in red under the control instead of the hint. */
  error?: string;
  as?: "label" | "div";
  className?: string;
  children: ReactNode;
}) {
  const captionId = useId();
  const caption = (
    <span className={`flex items-center gap-1.5 ${fieldLabelClass}`}>
      <span id={as === "div" ? captionId : undefined}>
        {label}
        {required ? <RequiredMark /> : null}
      </span>
      {help || example ? <FieldHelp help={help} example={example} label={label} /> : null}
    </span>
  );
  const below = error ? (
    <span className="mt-1.5 block text-xs leading-5 text-error">{error}</span>
  ) : hint ? (
    <span className="mt-1.5 block text-xs leading-5 text-muted">{hint}</span>
  ) : null;

  if (as === "div") {
    return (
      <div role="group" aria-labelledby={captionId} className={`block min-w-0 ${className}`}>
        {caption}
        <div className="mt-2">{children}</div>
        {below}
      </div>
    );
  }
  return (
    <label htmlFor={htmlFor} className={`block min-w-0 ${className}`}>
      {caption}
      <div className="mt-2">{children}</div>
      {below}
    </label>
  );
}

// ── Controls ──
export function DashboardInput({ className = "", ...props }: ComponentPropsWithRef<"input">) {
  return <input {...props} className={`${controlClass} ${className}`} />;
}

/** Accepts a ref (React 19 passes it as a prop), e.g. for inserting text at the caret. */
export function DashboardTextarea({ className = "", ...props }: ComponentPropsWithRef<"textarea">) {
  return <textarea {...props} className={`${controlClass} resize-y leading-6 ${className}`} />;
}

export function DashboardSelect({ className = "", style, children, ...props }: ComponentPropsWithRef<"select">) {
  return (
    <div className="relative">
      <select {...props} style={{ colorScheme: "dark", ...style }} className={`${controlClass} cursor-pointer appearance-none pr-10 ${className}`}>
        {children}
      </select>
      <ChevronDown size={15} aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
    </div>
  );
}

/** A native checkbox (sent as "on" when ticked), with an optional "?" note and a hint line. */
export function DashboardCheckbox({
  name,
  label,
  defaultChecked,
  hint,
  help,
  value,
  disabled,
  className = "",
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
  hint?: ReactNode;
  help?: ReactNode;
  value?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={`flex cursor-pointer items-start gap-2.5 py-2.5 text-sm text-foreground ${className}`}>
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} disabled={disabled} className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary" />
      <span className="min-w-0">
        <span className="inline-flex flex-wrap items-center gap-1.5">
          {label}
          {help ? <FieldHelp help={help} label={label} /> : null}
        </span>
        {hint ? <span className="mt-0.5 block text-xs leading-5 text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

// ── Status badge ──
export type StatusTone = "gold" | "green" | "muted" | "red" | "neutral";

const TONES: Record<StatusTone, string> = {
  gold: "border-primary/40 bg-primary-soft text-primary",
  green: "border-success/40 text-success",
  muted: "border-line text-muted",
  red: "border-error/50 text-error",
  neutral: "border-line-strong text-foreground",
};

const STATUS_TONES: Record<string, StatusTone> = {
  published: "gold",
  live: "gold",
  featured: "gold",
  visible: "gold",
  new: "gold",
  draft: "muted",
  hidden: "muted",
  archived: "muted",
  replied: "green",
  error: "red",
};

/**
 * A small mono pill. `status` picks the colour (published/live/featured/visible/new gold;
 * draft/hidden/archived dim; replied green; error red) and is the text unless children are
 * given; `tone` sets the colour outright.
 */
export function StatusBadge({ status, tone, children, className = "" }: { status?: string; tone?: StatusTone; children?: ReactNode; className?: string }) {
  const text = status ?? (typeof children === "string" ? children : undefined);
  const resolved = tone ?? (text ? STATUS_TONES[text.trim().toLowerCase()] : undefined) ?? "neutral";
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase leading-4 tracking-[0.14em] ${TONES[resolved]} ${className}`}>
      {children ?? status}
    </span>
  );
}

// ── Field group: a nested box of related fields inside a form ──
export function FieldGroup({ title, description, className = "", children }: { title: string; description?: ReactNode; className?: string; children: ReactNode }) {
  const titleId = useId();
  return (
    <div role="group" aria-labelledby={titleId} className={`grid min-w-0 gap-5 rounded-card border border-line-strong bg-raised p-4 ${className}`}>
      <div>
        <h3 id={titleId} className={`${fieldLabelClass} font-normal leading-5`}>
          {title}
        </h3>
        {description ? <p className="mt-1 text-xs leading-5 text-muted">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

// ── Notice: one line at the top of a page, e.g. "Saved “Weddings”." after a save redirects back ──
export function DashboardNotice({ tone = "success", children }: { tone?: "success" | "error"; children: ReactNode }) {
  const failed = tone === "error";
  const Icon = failed ? CircleAlert : CircleCheck;
  return (
    <div
      role={failed ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-card border px-4 py-3 text-sm leading-6 ${failed ? "border-error/50 bg-error/10 text-error" : "border-primary/35 bg-primary-soft text-strong"}`}
    >
      <Icon size={16} aria-hidden className={`mt-1 shrink-0 ${failed ? "" : "text-primary"}`} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

// ── Empty state: a list with nothing in it (yet), or a search that found nothing ──
export function DashboardEmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <DashboardCard className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <p className="text-xl font-semibold text-strong">{title}</p>
      {children ? <div className="max-w-md text-sm leading-6 text-muted">{children}</div> : null}
      {action ? <div className="mt-3 flex flex-wrap items-center justify-center gap-3">{action}</div> : null}
    </DashboardCard>
  );
}
