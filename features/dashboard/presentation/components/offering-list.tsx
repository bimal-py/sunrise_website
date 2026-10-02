import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpRight } from "lucide-react";
import type { OfferingIcon as IconName } from "@/shared/domain/offering";
import { OfferingIcon } from "@/shared/components/content/offering-icon";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { rowLinkClass, StatusBadge } from "./ui";

type Row = { id: string; slug: string; name: string; icon: IconName; summary: string; published: boolean; featured: boolean; note?: string };

/** Services or prints in display order, with move up/down, badges and links. */
export function OfferingList({ rows, section, publicPath, move, emptyText }: { rows: Row[]; section: string; publicPath: (slug: string) => string; move: (formData: FormData) => Promise<void>; emptyText: string }) {
  if (rows.length === 0) return <EmptyState title="Nothing here yet">{emptyText}</EmptyState>;
  const arrow = "flex size-9 items-center justify-center rounded-control border border-line-strong text-muted transition-colors duration-150 hover:border-primary hover:text-primary disabled:opacity-30";
  return (
    <ol className="divide-y divide-line rounded-panel border border-line bg-surface">
      {rows.map((row, index) => (
        <li key={row.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5">
          <div className="flex items-center gap-2">
            {(["up", "down"] as const).map((direction) => (
              <form key={direction} action={move}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="direction" value={direction} />
                <button type="submit" className={arrow} disabled={direction === "up" ? index === 0 : index === rows.length - 1} aria-label={`Move ${row.name} ${direction}`}>
                  {direction === "up" ? <ArrowUp className="h-4 w-4" aria-hidden /> : <ArrowDown className="h-4 w-4" aria-hidden />}
                </button>
              </form>
            ))}
          </div>
          <span className="hidden size-10 shrink-0 items-center justify-center rounded-full border border-line-strong sm:flex">
            <OfferingIcon name={row.icon} />
          </span>
          <div className="min-w-0 flex-1">
            <Link href={`/dashboard/${section}/${row.id}`} className="font-medium text-strong hover:text-primary">
              {row.name}
            </Link>
            <p className="mt-0.5 line-clamp-1 text-sm text-muted">{row.summary}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {!row.published && <StatusBadge>Hidden</StatusBadge>}
              {row.featured && <StatusBadge tone="gold">Featured</StatusBadge>}
              {row.note && <StatusBadge>{row.note}</StatusBadge>}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href={`/dashboard/${section}/${row.id}`} className={rowLinkClass}>
              Edit
            </Link>
            {row.published && (
              <a href={publicPath(row.slug)} target="_blank" rel="noopener noreferrer" className={rowLinkClass}>
                View <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </a>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
