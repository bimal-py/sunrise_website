import { DashboardButton } from "./dashboard-button";

/** "← Previous · 1–25 of 80 posts · Next →" under a server-paged list. Nothing when it all fits on one page. */
export function Pager({
  page,
  total,
  pageSize,
  href,
  noun = "",
  className = "",
}: {
  page: number;
  total: number;
  pageSize: number;
  href: (page: number) => string;
  noun?: string;
  className?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pages" className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-line pt-5 ${className}`}>
      {page > 1 ? <DashboardButton href={href(page - 1)}>← Previous</DashboardButton> : <span />}
      {/* On phones the count gets its own line above the two buttons. */}
      <p className="order-first w-full text-center font-mono text-[11px] uppercase tracking-[0.16em] text-muted sm:order-none sm:w-auto">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} {noun}
      </p>
      {page < pages ? <DashboardButton href={href(page + 1)}>Next →</DashboardButton> : <span />}
    </nav>
  );
}
