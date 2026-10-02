"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { doneProgress, onProgress, startProgress } from "./progress-store";

/**
 * The thin gold bar at the top of the window while something loads, as on the portfolio:
 * internal link clicks (the App Router has no public route events, so clicks are caught in
 * the capture phase) and dashboard saves. It trickles toward 90% and completes when the new
 * route commits or the save returns; a safety timeout means it can never hang. No glow
 * (the design has none): a 2px line in the logo's gold.
 */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const trickle = useRef(0);
  const timers = useRef<number[]>([]);
  const navigating = useRef(false);
  const first = useRef(true);

  useEffect(() => {
    const clearAll = () => {
      window.clearInterval(trickle.current);
      trickle.current = 0;
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
    const show = () => {
      clearAll();
      setVisible(true);
      setWidth(8);
      trickle.current = window.setInterval(() => setWidth((w) => (w < 90 ? w + Math.max(0.4, (90 - w) * 0.08) : w)), 180);
      timers.current.push(window.setTimeout(hide, 15000));
    };
    function hide() {
      clearAll();
      setWidth((w) => (w > 0 ? 100 : 0));
      timers.current.push(window.setTimeout(() => setVisible(false), 220));
      timers.current.push(window.setTimeout(() => setWidth(0), 460));
    }
    const unsubscribe = onProgress((busy) => (busy ? show() : hide()));

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      const href = anchor?.getAttribute("href");
      if (!anchor || !href || href.startsWith("#") || anchor.target === "_blank" || anchor.hasAttribute("download") || /^(mailto:|tel:)/.test(href)) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      // Same-origin navigations that change the page (a hash on this page doesn't).
      if (url.origin !== window.location.origin || (url.pathname === window.location.pathname && url.search === window.location.search)) return;
      if (!navigating.current) {
        navigating.current = true;
        startProgress();
      }
    };
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      unsubscribe();
      clearAll();
    };
  }, []);

  // The new route is on screen: finish the navigation's share of the bar.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (navigating.current) {
      navigating.current = false;
      doneProgress();
    }
  }, [pathname, search]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[100] h-[2px] bg-primary"
      style={{ width: `${width}%`, opacity: visible ? 1 : 0, transition: "width 0.2s ease, opacity 0.3s ease" }}
    />
  );
}
