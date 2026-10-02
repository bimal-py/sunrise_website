import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { routes } from "@/lib/routes";
import type { PageRow } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/utils/date";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { PageHeader, rowLinkClass, StatusBadge } from "@/features/dashboard/presentation/components/ui";
import { getPageDefinition, PAGE_KEYS, savedText, type PageDefinition } from "@/features/site/domain/page-content";

export const metadata: Metadata = { title: "Pages" };

/** What's been changed from the wording in code: "2 fields · intro · search". Empty = all default. */
function changes(page: PageDefinition, row: PageRow | undefined): string[] {
  if (!row) return [];
  const fields = page.fields.filter((field) => savedText(row.content, field.name)).length;
  return [
    fields > 0 && `${fields} ${fields === 1 ? "field" : "fields"}`,
    page.body && row.body.trim() && page.body.label.toLowerCase(),
    page.seo && (row.seo_title.trim() || row.seo_description.trim() || row.og_image) && "search and sharing",
  ].filter((part): part is string => Boolean(part));
}

export default async function DashboardPagesPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("pages").select("*");
  if (error) throw new Error(`Couldn't load pages: ${error.message}`);
  const rows = new Map(data.map((row) => [row.key, row]));

  return (
    <>
      <PageHeader
        eyebrow="Pages"
        title="Pages"
        description="The words on the site's fixed pages and how each shows in search results. Every field starts with the page's own wording, so nothing here has to be filled in."
      />
      <ul className="divide-y divide-line rounded-panel border border-line bg-surface">
        {PAGE_KEYS.map((key) => {
          const page = getPageDefinition(key);
          const row = rows.get(key);
          const edited = changes(page, row);
          return (
            <li key={key} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <Link href={routes.dashboardItem("pages", key)} className="font-medium text-strong hover:text-primary">
                    {page.label}
                  </Link>
                  <span className="font-mono text-xs text-muted">{page.path}</span>
                </p>
                <p className="mt-0.5 text-sm text-muted">{page.summary}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {edited.length > 0 ? <StatusBadge tone="gold">Edited</StatusBadge> : <StatusBadge>Default</StatusBadge>}
                  {edited.length > 0 && <span className="text-xs text-muted">{edited.join(" · ")}</span>}
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-1 sm:items-end">
                <p className="font-mono text-xs text-muted">{row ? `Updated ${formatDateTime(row.updated_at)}` : "Not saved yet"}</p>
                <div className="flex items-center gap-4">
                  <Link href={routes.dashboardItem("pages", key)} className={rowLinkClass}>
                    Edit
                  </Link>
                  <a href={page.path} target="_blank" rel="noopener noreferrer" className={rowLinkClass}>
                    View <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                  </a>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
