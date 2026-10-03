"use client";

import { Children, useCallback, useEffect, useRef, type ReactNode } from "react";
import { matchesFilter, setListFilter, useListFilter, type FilterTarget } from "./list-filter";

/**
 * A grid of server-rendered cards with infinite scroll, as on the portfolio: `pageSize`
 * cards show, and the next batch appears as the reader nears the end. The page reached is
 * written to ?page= so a reload or "back" from a card lands at the same depth. Every card
 * is already in the static HTML (crawlers see them all), so a "page" is revealed instantly
 * with no request to the server. `targets[i]` describes `children[i]` for the filter.
 */
export function PagedGrid({ targets, pageSize, noun, className, children }: { targets: FilterTarget[]; pageSize: number; noun: string; className?: string; children: ReactNode }) {
  const filter = useListFilter();
  const items = Children.toArray(children);
  const matched = targets.flatMap((target, index) => (matchesFilter(filter, target) ? [index] : []));
  const shown = Math.min(matched.length, filter.page * pageSize);
  const visible = new Set(matched.slice(0, shown));
  const hasMore = shown < matched.length;
  const sentinel = useRef<HTMLDivElement>(null);

  const showMore = useCallback(() => {
    const next = filter.page + 1;
    setListFilter({ page: next });
    const params = new URLSearchParams(window.location.search);
    params.set("page", String(next));
    window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
  }, [filter.page]);

  // Reveal the next batch while the end of the grid is still a screen away. A new observer
  // per page reports at once if the end is still in range, so short pages chain on.
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver((entries) => entries.some((entry) => entry.isIntersecting) && showMore(), { rootMargin: "600px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, showMore]);

  return (
    <>
      <div className={className}>
        {items.map((child, index) => (
          <div key={index} data-paged-item className={visible.has(index) ? "min-w-0" : "hidden min-w-0"}>
            {child}
          </div>
        ))}
      </div>
      {/* Without JavaScript nothing filters or pages: show every card (and drop the "12 of 40" count).
          Hidden by class, not the hidden attribute: Tailwind's base layer hides [hidden] with !important,
          which an unlayered rule like this one can't override. */}
      <noscript dangerouslySetInnerHTML={{ __html: "<style>[data-paged-item].hidden{display:block!important}[data-paged-status]{display:none!important}</style>" }} />
      {matched.length > pageSize && (
        <div data-paged-status className="mt-10 flex flex-col items-center gap-4">
          {hasMore && <div ref={sentinel} aria-hidden className="h-px w-full" />}
          <p role="status" className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            {hasMore ? `${shown} of ${matched.length} ${noun}` : `All ${matched.length} ${noun}`}
          </p>
        </div>
      )}
    </>
  );
}
