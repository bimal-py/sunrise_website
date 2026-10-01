"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Filtering for the static index pages (/films ?category=, /blogs ?tag= &q=). The server
 * renders every card, so the page stays one static file (no function call, no cache entry
 * per query) and crawlers see the full list. The URL's filter is mirrored into this small
 * store and cards that don't match are hidden in the browser.
 */
export type ListFilterState = { category: string; tag: string; q: string };

const initial: ListFilterState = { category: "", tag: "", q: "" };
let state = initial;
const listeners = new Set<() => void>();

export function setListFilter(next: Partial<ListFilterState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useListFilter(): ListFilterState {
  return useSyncExternalStore(subscribe, () => state, () => initial);
}

export type FilterTarget = { group?: string; tags?: string[]; text?: string };

/** Every word of `q` must appear in the item's text; `tag` and `category` must match exactly. */
export function matchesFilter(filter: ListFilterState, item: FilterTarget): boolean {
  if (filter.category && item.group !== filter.category) return false;
  if (filter.tag && !item.tags?.includes(filter.tag)) return false;
  const words = filter.q.toLowerCase().split(/\s+/).filter(Boolean);
  const text = (item.text ?? "").toLowerCase();
  return words.every((word) => text.includes(word));
}

/** Mirrors the URL's ?category= / ?tag= / ?q= into the filter. Render inside <Suspense fallback={null}>. */
export function ListFilterSync() {
  const params = useSearchParams();
  const category = params.get("category")?.trim() ?? "";
  const tag = params.get("tag")?.trim() ?? "";
  const q = params.get("q")?.trim() ?? "";

  useEffect(() => {
    setListFilter({ category, tag, q });
  }, [category, tag, q]);

  // Leaving the page: the next index starts unfiltered.
  useEffect(() => () => setListFilter(initial), []);

  return null;
}

/** A card slot that hides itself when it doesn't match the current filter. */
export function FilterItem({ target, className, children }: { target: FilterTarget; className?: string; children: ReactNode }) {
  const filter = useListFilter();
  return (
    <div className={className} hidden={!matchesFilter(filter, target)}>
      {children}
    </div>
  );
}

/** How many of `targets` match right now, for counts and empty states. */
export function useMatchCount(targets: FilterTarget[]): number {
  const filter = useListFilter();
  return targets.filter((target) => matchesFilter(filter, target)).length;
}
