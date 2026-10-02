"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookImage,
  BookOpen,
  Camera,
  Clapperboard,
  FileCode,
  FileText,
  FolderOpen,
  Inbox,
  LayoutDashboard,
  MessageSquareQuote,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type DashboardSection =
  | "overview" | "messages" | "films" | "services" | "prints" | "blogs" | "reviews" | "pages" | "root-files" | "file-manager" | "settings";

const SECTIONS: { id: DashboardSection; label: string; href: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { id: "messages", label: "Messages", href: "/dashboard/messages", icon: Inbox },
  { id: "films", label: "Films", href: "/dashboard/films", icon: Clapperboard },
  { id: "services", label: "Services", href: "/dashboard/services", icon: Camera },
  { id: "prints", label: "Prints", href: "/dashboard/prints", icon: BookImage },
  { id: "blogs", label: "Blogs", href: "/dashboard/blogs", icon: BookOpen },
  { id: "reviews", label: "Reviews", href: "/dashboard/reviews", icon: MessageSquareQuote },
  { id: "pages", label: "Pages", href: "/dashboard/pages", icon: FileText },
  { id: "root-files", label: "Root Files", href: "/dashboard/root-files", icon: FileCode },
  { id: "file-manager", label: "File Manager", href: "/dashboard/file-manager", icon: FolderOpen },
  { id: "settings", label: "Settings", href: "/dashboard/settings", icon: Settings },
];

/** The dashboard's tabs, as on the portfolio's: a row of items, the current one in gold. Scrolls sideways on phones; wraps on wide screens. */
export function DashboardNav({ available, unread }: { available: DashboardSection[]; unread: number }) {
  const pathname = usePathname();
  const items = SECTIONS.filter((section) => available.includes(section.id));

  return (
    <nav aria-label="Dashboard" className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex w-max gap-1 lg:w-auto lg:flex-wrap lg:gap-0.5">
        {items.map(({ id, label, href, icon: Icon }) => {
          const active = href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={id}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-10 items-center gap-2 rounded-control border px-3.5 text-sm transition-colors duration-150 lg:px-2.5 ${
                  active ? "border-primary/50 bg-nav-active text-primary" : "border-transparent text-muted hover:text-strong"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
                {id === "messages" && unread > 0 && (
                  <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-5 text-on-primary" aria-label={`${unread} new`}>
                    {unread}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
