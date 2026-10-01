"use client";

import Link from "next/link";
import { routes } from "@/lib/routes";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { useListFilter } from "@/shared/components/filter/list-filter";

const chip = "inline-flex h-9 shrink-0 items-center rounded-control border px-3 text-sm transition-colors duration-150";

type CategoryChip = { slug: string; label: string; count: number };

/** All / Weddings / Ceremonies / Culture chips; the active one follows ?category=. */
export function FilmCategoryNav({ total, categories }: { total: number; categories: CategoryChip[] }) {
  const { category } = useListFilter();
  const items = [
    { key: "all", label: `All (${total})`, href: routes.films(), active: !category },
    ...categories.map((c) => ({ key: c.slug, label: `${c.label} (${c.count})`, href: routes.filmCategory(c.slug), active: category === c.slug })),
  ];

  return (
    <nav aria-label="Film categories" className="-mx-4 mb-8 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <ul className="flex gap-2">
        {items.map((item) => (
          <li key={item.key} className="shrink-0">
            <Link
              href={item.href}
              scroll={false}
              aria-current={item.active ? "page" : undefined}
              className={`${chip} ${item.active ? "border-primary bg-primary-soft text-strong" : "border-line-strong text-foreground hover:border-primary"}`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Shown when the chosen category has no films (or there are none at all). */
export function FilmsEmpty({ total, counts }: { total: number; counts: Record<string, number> }) {
  const { category } = useListFilter();
  const empty = category ? (counts[category] ?? 0) === 0 : total === 0;
  if (!empty) return null;
  return <EmptyState title="No films here yet">New films are on the way. Our YouTube channel has everything we&apos;ve published.</EmptyState>;
}
