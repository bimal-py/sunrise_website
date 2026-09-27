"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { homeSectionIds, navItems } from "@/lib/constants/navigation";

/**
 * Which nav item is active (after the owner's portfolio).
 *  - Home page: the section most in view, via IntersectionObserver (state is
 *    only set inside the observer callback).
 *  - Any other page: the item whose `route` the path is in (/films/x → films).
 *    Pages outside every section (/privacy, the 404) highlight nothing.
 */
export function useActiveSection(): string {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [inView, setInView] = useState<string>("home");

  useEffect(() => {
    if (!isHome) return;
    const ratios = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) ratios.set(entry.target.id, entry.intersectionRatio);
        let best = "home";
        let bestRatio = -1;
        for (const id of homeSectionIds) {
          const ratio = ratios.get(id) ?? 0;
          if (ratio > bestRatio) {
            best = id;
            bestRatio = ratio;
          }
        }
        setInView(best);
      },
      { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1], rootMargin: "-10% 0px -10% 0px" },
    );
    for (const id of homeSectionIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [isHome]);

  if (isHome) return inView;
  return navItems.find((item) => item.route !== "/" && (pathname === item.route || pathname.startsWith(`${item.route}/`)))?.id ?? "";
}
