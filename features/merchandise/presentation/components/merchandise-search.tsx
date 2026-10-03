"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { routes } from "@/lib/routes";
import { setListFilter, useListFilter } from "@/shared/components/filter/list-filter";
import { merchandiseFind } from "../lib/merchandise-url";

/**
 * Live search for the shop, like the blog's: the grid filters as you type (in the browser,
 * over the static page) and the URL follows a moment later (?q=, keeping the category), so
 * a search can be shared. Without JavaScript the form submits to the same URL.
 */
export function MerchandiseSearch() {
  const router = useRouter();
  const { q, category } = useListFilter();
  const [value, setValue] = useState(q);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // The URL changed from elsewhere (a category chip, "see everything"): show its words.
  const [seen, setSeen] = useState(q);
  if (q !== seen) {
    setSeen(q);
    if (q !== value.trim()) setValue(q);
  }

  const go = (words: string) => {
    window.clearTimeout(timer.current);
    router.replace(merchandiseFind({ category, q: words }), { scroll: false });
  };

  return (
    <form
      role="search"
      action={routes.merchandise()}
      onSubmit={(event) => {
        event.preventDefault();
        go(value);
      }}
      className="relative w-full max-w-md"
    >
      {category && <input type="hidden" name="category" value={category} />}
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        type="search"
        name="q"
        value={value}
        onChange={(event) => {
          const words = event.target.value;
          setValue(words);
          setListFilter({ q: words.trim(), page: 1 });
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => go(words), 350);
        }}
        placeholder="Search the shop…"
        aria-label="Search the shop"
        className="h-12 w-full rounded-control border border-line-strong bg-raised pl-11 pr-4 text-sm text-strong transition-colors duration-150 placeholder:text-muted focus:border-primary focus:outline-none"
      />
    </form>
  );
}
