import Link from "next/link";
import type { ReactNode } from "react";
import { eyebrowClasses } from "@/shared/components/ui/section-heading";

/**
 * The dashboard's kit, on the site's own tokens: surfaces with borders (no shadows,
 * gradients or glows), 6/8/10px radii, gold for actions and focus. Primary actions and
 * submits use SpriteButton; destructive ones are quiet red text with a confirmation.
 */

export const inputClass =
  "h-11 w-full rounded-control border border-line-strong bg-raised px-3 text-[15px] text-strong placeholder:text-muted/70 focus:border-primary focus:outline-none aria-[invalid=true]:border-error";
export const textareaClass = `${inputClass} h-auto min-h-28 py-2.5 leading-relaxed`;
export const monoTextareaClass = `${textareaClass} font-mono text-[13px]`;
export const labelClass = "mb-1.5 block text-sm font-medium text-strong";
export const selectClass = `${inputClass} appearance-none bg-[length:14px] bg-[right_0.75rem_center] bg-no-repeat pr-9 bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ACA89F' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")]`;

export function Panel({ title, description, actions, children, className = "" }: { title?: string; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-panel border border-line bg-surface p-5 sm:p-6 ${className}`}>
      {(title || actions) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="font-sans text-lg font-semibold text-strong">{title}</h2>}
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className={eyebrowClasses}>{eyebrow}</p>}
        <h1 className="mt-1 text-[34px] leading-tight sm:text-[40px]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
    </div>
  );
}

export function Field({ label, htmlFor, hint, error, children, className = "" }: { label: string; htmlFor?: string; hint?: ReactNode; error?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
      </label>
      {children}
      {error ? <p className="mt-1.5 text-sm text-error">{error}</p> : hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function Checkbox({ name, label, defaultChecked, hint }: { name: string; label: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-1">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 size-4 shrink-0 accent-[color:var(--primary)]" />
      <span>
        <span className="text-sm font-medium text-strong">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

type Tone = "gold" | "green" | "muted" | "red";
const tones: Record<Tone, string> = {
  gold: "bg-primary-soft text-primary",
  green: "border border-success/40 text-success",
  muted: "border border-line-strong text-muted",
  red: "border border-error/40 text-error",
};

export function StatusBadge({ tone = "muted", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

/** A labelled number for the overview. */
export function Stat({ label, value, note, href }: { label: string; value: ReactNode; note?: ReactNode; href?: string }) {
  const body = (
    <>
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 font-display text-[40px] font-semibold leading-none text-strong">{value}</p>
      {note && <p className="mt-2 text-xs text-muted">{note}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="block rounded-card border border-line bg-surface p-5 transition-colors duration-150 hover:border-line-strong">
      {body}
    </Link>
  ) : (
    <div className="rounded-card border border-line bg-surface p-5">{body}</div>
  );
}

/** "← Newer · 1–25 of 80 · Older →" under a server-paged dashboard list. */
export function Pager({ page, total, pageSize, href, noun = "" }: { page: number; total: number; pageSize: number; href: (page: number) => string; noun?: string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const link = "inline-flex min-h-10 items-center text-sm text-primary hover:text-primary-strong";
  return (
    <nav aria-label="Pages" className="mt-8 flex items-center justify-between gap-4 border-t border-line pt-5">
      {page > 1 ? <Link href={href(page - 1)} className={link}>← Previous</Link> : <span />}
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} {noun}
      </p>
      {page < pages ? <Link href={href(page + 1)} className={link}>Next →</Link> : <span />}
    </nav>
  );
}

/** Gold text link for row actions ("Edit", "View ↗"). */
export const rowLinkClass = "inline-flex min-h-8 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline";
