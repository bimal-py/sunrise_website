"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard/settings", label: "Studio" },
  { href: "/dashboard/settings/redirects", label: "Redirects" },
  { href: "/dashboard/settings/account", label: "Account" },
];

/** Sub-sections of Settings. */
export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings sections" className="mb-6 flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex h-9 items-center rounded-control border px-3 text-sm transition-colors duration-150 ${active ? "border-primary bg-primary-soft text-strong" : "border-line-strong text-foreground hover:border-primary"}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
