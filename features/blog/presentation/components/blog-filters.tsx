"use client";

import Link from "next/link";
import { routes } from "@/lib/routes";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { useListFilter, useMatchCount, type FilterTarget } from "@/shared/components/filter/list-filter";

const chip = "inline-flex h-8 items-center rounded-full border px-4 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors duration-150";

/** Topic chips; each keeps the search words, and the active one follows ?tag=. */
export function BlogTopicNav({ topics }: { topics: { label: string; slug: string }[] }) {
  const { tag, q } = useListFilter();
  if (topics.length === 0) return null;
  const items = [
    { key: "all", label: "All", href: routes.blogFind({ q }), active: !tag },
    ...topics.map((topic) => ({ key: topic.slug, label: topic.label, href: routes.blogFind({ tag: topic.slug, q }), active: tag === topic.slug })),
  ];

  return (
    <nav aria-label="Topics" className="mt-6 flex flex-wrap justify-center gap-2">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          scroll={false}
          aria-current={item.active ? "page" : undefined}
          className={`${chip} ${item.active ? "border-primary bg-primary-soft text-primary" : "border-line-strong text-muted hover:border-primary hover:text-strong"}`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

/** "3 guides on Weddings matching “album”" when filtered, or the empty state. */
export function BlogResults({ targets, topics }: { targets: FilterTarget[]; topics: { label: string; slug: string }[] }) {
  const { tag, q } = useListFilter();
  const count = useMatchCount(targets);
  const filtered = Boolean(tag || q);
  const topic = topics.find((t) => t.slug === tag)?.label;

  if (count === 0) {
    return (
      <EmptyState title={filtered ? "No matching guides" : "No guides yet"}>
        {filtered ? (
          <>
            Try other words or another topic, or{" "}
            <Link href={routes.blog()} scroll={false} className="text-primary underline underline-offset-4 hover:text-primary-strong">
              clear the filters
            </Link>
            .
          </>
        ) : (
          "New guides are on the way."
        )}
      </EmptyState>
    );
  }
  if (!filtered) return null;
  return (
    <p className="mb-6 text-center font-mono text-[11px] uppercase tracking-[0.15em] text-muted">
      {count} {count === 1 ? "guide" : "guides"}
      {topic && ` on ${topic}`}
      {q && ` matching “${q}”`}
    </p>
  );
}
