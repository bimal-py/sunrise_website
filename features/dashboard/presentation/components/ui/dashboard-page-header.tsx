import type { ReactNode } from "react";
import { SpriteButton } from "@/shared/components/ui/sprite-button";
import { eyebrowClass } from "./dashboard-ui";

/**
 * The card at the top of every dashboard page (Overview aside), as on the portfolio: the
 * section's name in mono gold, the page's one <h1>, a sentence on what it's for, and the
 * page's main action as the gold button on the right (it drops under the text on phones).
 */
export function DashboardPageHeader({
  eyebrow,
  title,
  description,
  primaryAction,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  /** The gold button: "New product", "Create new blog". */
  primaryAction?: { href: string; label: string; icon?: ReactNode };
  /** Anything else for the right-hand side (secondary buttons, a back link), before the primary action. */
  actions?: ReactNode;
}) {
  return (
    <header className="rounded-panel border border-line bg-surface px-6 py-6 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          {eyebrow ? <p className={eyebrowClass}>{eyebrow}</p> : null}
          <h1 className={`${eyebrow ? "mt-3" : ""} break-words font-display text-3xl font-semibold leading-tight text-strong sm:text-4xl`}>{title}</h1>
          {description ? <div className="mt-3 text-sm leading-7 text-muted">{description}</div> : null}
        </div>
        {primaryAction || actions ? (
          <div className="flex flex-wrap items-center gap-3">
            {actions}
            {primaryAction ? (
              <SpriteButton href={primaryAction.href}>
                {primaryAction.icon}
                {primaryAction.label}
              </SpriteButton>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
