"use client";

import Link from "next/link";
import { routes } from "@/lib/routes";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { useListFilter, useMatchCount, type FilterTarget } from "@/shared/components/filter/list-filter";
import { merchandiseFind } from "../lib/merchandise-url";

export type CategoryChip = { slug: string; label: string };

const chip = "inline-flex h-9 shrink-0 items-center rounded-full border px-4 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors duration-150";

/** All / each category, as chips; each keeps the search words, and the active one follows ?category=. */
export function MerchandiseCategoryNav({ categories }: { categories: CategoryChip[] }) {
  const { category, q } = useListFilter();
  if (categories.length === 0) return null;
  const items = [
    { key: "all", label: "All", href: merchandiseFind({ q }), active: !category },
    ...categories.map((c) => ({ key: c.slug, label: c.label, href: merchandiseFind({ category: c.slug, q }), active: category === c.slug })),
  ];

  return (
    <nav aria-label="Categories" className="-mx-4 mt-6 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <ul className="flex gap-2 sm:flex-wrap sm:justify-center">
        {items.map((item) => (
          <li key={item.key} className="shrink-0">
            <Link
              href={item.href}
              scroll={false}
              aria-current={item.active ? "page" : undefined}
              className={`${chip} ${item.active ? "border-primary bg-primary-soft text-primary" : "border-line-strong text-muted hover:border-primary hover:text-strong"}`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** "3 products in Frames matching “walnut”" when filtered, or the empty state when nothing matches. */
export function MerchandiseResults({ targets, categories }: { targets: FilterTarget[]; categories: CategoryChip[] }) {
  const { category, q } = useListFilter();
  const count = useMatchCount(targets);
  const filtered = Boolean(category || q);
  const label = categories.find((c) => c.slug === category)?.label;

  if (count === 0 && filtered) {
    return (
      <EmptyState title="Nothing matches">
        Try other words or another category, or{" "}
        <Link href={routes.merchandise()} scroll={false} className="text-primary underline underline-offset-4 hover:text-primary-strong">
          see everything
        </Link>
        .
      </EmptyState>
    );
  }
  if (!filtered) return null;
  return (
    <p className="mb-6 text-center font-mono text-[11px] uppercase tracking-[0.15em] text-muted" role="status">
      {count} {count === 1 ? "product" : "products"}
      {label && ` in ${label}`}
      {q && ` matching “${q}”`}
    </p>
  );
}
