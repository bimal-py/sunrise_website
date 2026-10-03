"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { routes } from "@/lib/routes";

export type DashboardSection =
  | "overview"
  | "messages"
  | "films"
  | "services"
  | "prints"
  | "merchandise"
  | "blogs"
  | "reviews"
  | "pages"
  | "root-files"
  | "file-manager"
  | "settings";

const SECTIONS: { id: DashboardSection; label: string; href: string }[] = [
  { id: "overview", label: "Overview", href: routes.dashboard() },
  { id: "messages", label: "Messages", href: routes.dashboardSection("messages") },
  { id: "films", label: "Films", href: routes.dashboardSection("films") },
  { id: "services", label: "Services", href: routes.dashboardSection("services") },
  { id: "prints", label: "Prints", href: routes.dashboardSection("prints") },
  { id: "merchandise", label: "Merchandise", href: routes.dashboardSection("merchandise") },
  { id: "blogs", label: "Blogs", href: routes.dashboardSection("blogs") },
  { id: "reviews", label: "Reviews", href: routes.dashboardSection("reviews") },
  { id: "pages", label: "Pages", href: routes.dashboardSection("pages") },
  { id: "root-files", label: "Root Files", href: routes.dashboardSection("root-files") },
  { id: "file-manager", label: "File Manager", href: routes.dashboardSection("file-manager") },
  { id: "settings", label: "Settings", href: routes.dashboardSection("settings") },
];

/**
 * The dashboard's sections, as on the portfolio: text tabs in one row that scrolls sideways
 * when it doesn't fit (no scrollbar), the current one in gold. Overview is current only on
 * /dashboard itself; the others also on their pages below (an editor, a sub-page). The
 * Messages tab counts new messages.
 */
export function DashboardNav({ unread = 0 }: { unread?: number }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  // Bring the current tab into view when the row scrolls (phones), without scrolling the page.
  useEffect(() => {
    const nav = navRef.current;
    const current = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !current) return;
    const start = current.offsetLeft;
    const end = start + current.offsetWidth;
    if (start < nav.scrollLeft || end > nav.scrollLeft + nav.clientWidth) {
      nav.scrollLeft = Math.max(0, start - (nav.clientWidth - current.offsetWidth) / 2);
    }
  }, [pathname]);

  return (
    <nav ref={navRef} aria-label="Dashboard sections" className="relative flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {SECTIONS.map(({ id, label, href }) => {
        const active = href === routes.dashboard() ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={id}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-control border px-3.5 py-2 text-sm font-medium transition-colors duration-150 ${
              active ? "border-primary/35 bg-primary-soft text-primary" : "border-transparent text-muted hover:text-strong"
            }`}
          >
            {label}
            {id === "messages" && unread > 0 ? (
              <>
                <span aria-hidden className="rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-5 text-on-primary">
                  {unread > 99 ? "99+" : unread}
                </span>
                <span className="sr-only">({unread} new)</span>
              </>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
