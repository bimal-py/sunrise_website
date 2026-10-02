"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { routes } from "@/lib/routes";
import { setListFilter, useListFilter } from "@/shared/components/filter/list-filter";

/**
 * Live search for the blog: the list filters as you type (in the browser, over the
 * static page) and the URL follows a moment later (?q=, keeping the topic), so a search
 * can be shared. Without JavaScript the form submits to the same URL.
 */
export function BlogSearch() {
  const router = useRouter();
  const { q, tag } = useListFilter();
  const [value, setValue] = useState(q);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // The URL changed from elsewhere (a topic chip, "clear the filters"): show its words.
  const [seen, setSeen] = useState(q);
  if (q !== seen) {
    setSeen(q);
    if (q !== value.trim()) setValue(q);
  }

  const go = (words: string) => {
    window.clearTimeout(timer.current);
    router.replace(routes.blogFind({ tag, q: words }), { scroll: false });
  };

  return (
    <form
      role="search"
      action={routes.blog()}
      onSubmit={(event) => {
        event.preventDefault();
        go(value);
      }}
      className="relative w-full max-w-md"
    >
      {tag && <input type="hidden" name="tag" value={tag} />}
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
        placeholder="Search guides…"
        aria-label="Search guides"
        className="h-12 w-full rounded-control border border-line-strong bg-raised pl-11 pr-4 text-sm text-strong transition-colors duration-150 placeholder:text-muted focus:border-primary focus:outline-none"
      />
    </form>
  );
}
