import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Crumb } from "@/lib/seo/breadcrumbs";

/**
 * Visible trail at the top of a detail page (Home › Services › Weddings).
 * Detail pages lead with this instead of a "Back to …" button. Pass the same
 * `Crumb[]` to `breadcrumbJsonLd` so the structured data matches.
 *
 * The last crumb is the current page: not a link, and truncated to one line
 * because the page's own <h1> repeats it in full right below.
 */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  const last = crumbs.length - 1;

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 font-mono text-[0.65rem] uppercase tracking-[0.18em]">
        {crumbs.map((crumb, index) =>
          index < last && crumb.href ? (
            <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
              <Link href={crumb.href} className="inline-block py-1.5 text-muted transition-colors duration-150 hover:text-primary">
                {crumb.label}
              </Link>
              <ChevronRight size={11} strokeWidth={2} aria-hidden className="shrink-0 text-muted opacity-60" />
            </li>
          ) : (
            <li key={`${crumb.label}-${index}`} className="min-w-0 max-w-full">
              <span aria-current="page" className="block truncate py-1.5 text-strong">
                {crumb.label}
              </span>
            </li>
          ),
        )}
      </ol>
    </nav>
  );
}
