"use client";

import { useEffect, useRef, useState } from "react";
import { eyebrowClasses } from "@/shared/components/ui/section-heading";

export type TocItem = {
  id: string;
  label: string;
  /** Indents the item (an h3 under its h2). */
  indent?: boolean;
};

/**
 * "On this page": the page's headings as in-page links, the one you're reading
 * marked with a gold rule. Reading means the last heading above the middle of
 * the screen (the first before you reach any, the last at the very bottom).
 * The list scrolls inside its panel when it's long, keeping the marked item in
 * view without ever scrolling the page. Links are plain #anchors: the page's
 * smooth scrolling and the headings' scroll margin do the rest.
 */
export function TocNav({ items, heading = "On this page", itemsLang }: { items: TocItem[]; heading?: string; itemsLang?: string }) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const listRef = useRef<HTMLElement>(null);
  const idsKey = items.map((item) => item.id).join(",");

  useEffect(() => {
    const ids = idsKey ? idsKey.split(",") : [];
    if (ids.length === 0) return;
    let frame = 0;
    const compute = () => {
      frame = 0;
      const tops = ids
        .map((id) => ({ id, el: document.getElementById(id) }))
        .filter((entry): entry is { id: string; el: HTMLElement } => entry.el !== null)
        .map(({ id, el }) => ({ id, top: el.getBoundingClientRect().top }))
        .sort((a, b) => a.top - b.top);
      if (tops.length === 0) return;
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        setActiveId(tops[tops.length - 1].id);
        return;
      }
      const passed = tops.filter((entry) => entry.top <= window.innerHeight / 2);
      setActiveId((passed.at(-1) ?? tops[0]).id);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(compute);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [idsKey]);

  // Keep the marked item visible inside the panel's own scroll (never the page's).
  useEffect(() => {
    const list = listRef.current;
    const link = list?.querySelector<HTMLElement>(`[data-toc-id="${CSS.escape(activeId)}"]`);
    if (!list || !link) return;
    const listBox = list.getBoundingClientRect();
    const linkBox = link.getBoundingClientRect();
    if (linkBox.top < listBox.top) list.scrollTop -= listBox.top - linkBox.top + 8;
    else if (linkBox.bottom > listBox.bottom) list.scrollTop += linkBox.bottom - listBox.bottom + 8;
  }, [activeId]);

  if (items.length === 0) return null;
  return (
    <aside className="rounded-card border border-line bg-surface p-5">
      <p className={eyebrowClasses}>{heading}</p>
      <nav ref={listRef} aria-label={heading} className="mt-4 max-h-[min(60vh,32rem)] overflow-y-auto overscroll-contain [scrollbar-width:thin]">
        <ul lang={itemsLang} className="flex flex-col gap-0.5">
          {items.map((item) => {
            const active = item.id === activeId;
            return (
              <li key={item.id} className={item.indent ? "ml-3" : undefined}>
                <a
                  href={`#${item.id}`}
                  data-toc-id={item.id}
                  aria-current={active ? "location" : undefined}
                  className={`block border-l-2 py-1 pl-3 text-sm leading-6 transition-colors duration-150 ${
                    active ? "border-primary font-medium text-strong" : "border-transparent text-muted hover:text-strong"
                  }`}
                >
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
