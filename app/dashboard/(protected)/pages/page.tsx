import type { Metadata } from "next";
import { routes } from "@/lib/routes";
import type { PageRow } from "@/lib/supabase/types";
import { formatDate } from "@/lib/utils/date";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { DashboardResourceActions } from "@/features/dashboard/presentation/components/ui/dashboard-resource-actions";
import { DashboardCard, DashboardNotice, StatusBadge } from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { getPageDefinition, PAGE_KEYS, savedText, type PageDefinition } from "@/features/site/domain/page-content";

export const metadata: Metadata = { title: "Pages" };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** What's been changed from the wording in code: "2 fields · introduction". Empty = all default. */
function copyChanges(page: PageDefinition, row: PageRow | undefined): string[] {
  if (!row) return [];
  const fields = page.fields.filter((field) => savedText(row.content, field.name)).length;
  return [fields > 0 && `${fields} ${fields === 1 ? "field" : "fields"}`, page.body && row.body.trim() && page.body.label.toLowerCase()].filter(
    (part): part is string => Boolean(part),
  );
}

export default async function DashboardPagesPage({ searchParams }: PageProps) {
  const search = await searchParams;
  const savedParam = search.saved;
  const saved = (Array.isArray(savedParam) ? savedParam[0] : savedParam)?.trim() ?? "";
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("pages").select("key, content, body, seo_title, seo_description, og_image, updated_at");
  if (error) throw new Error(`Couldn't load the pages: ${error.message}`);
  const rows = new Map(data.map((row) => [row.key, row]));

  return (
    <div className="grid gap-8">
      <DashboardPageHeader
        eyebrow="Pages"
        title="The words on the site's fixed pages."
        description="Each page starts with its own wording, so nothing here has to be filled in. Change a field to replace it, empty it to go back to the original, and set how the page shows in Google and link previews."
      />

      {saved ? <DashboardNotice>Saved the {saved} page. It shows the change on the next visit.</DashboardNotice> : null}

      <section className="grid gap-6" aria-label="Pages">
        {PAGE_KEYS.map((key) => {
          const page = getPageDefinition(key);
          const row = rows.get(key);
          const changed = copyChanges(page, row);
          const seoSet = Boolean(page.seo && row && (row.seo_title.trim() || row.seo_description.trim() || row.og_image));
          const seoTitle = page.seo ? row?.seo_title.trim() || page.seo.title : "";
          const seoDescription = page.seo ? row?.seo_description.trim() || page.seo.description : "";
          const meta = [row ? `Updated ${formatDate(row.updated_at)}` : "Not saved yet", changed.length > 0 ? `Edited: ${changed.join(", ")}` : ""].filter(Boolean);
          return (
            <DashboardCard key={key} className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-display text-[26px] font-semibold leading-tight text-strong">{page.label}</h2>
                    {page.fields.length > 0 || page.body ? <StatusBadge tone={changed.length > 0 ? "gold" : "muted"}>{changed.length > 0 ? "Edited" : "Default words"}</StatusBadge> : null}
                    {page.seo ? <StatusBadge tone={seoSet ? "gold" : "muted"}>{seoSet ? "SEO set" : "SEO default"}</StatusBadge> : null}
                  </div>
                  <p className="mt-1 font-mono text-xs text-muted">{page.path}</p>
                  <p className="mt-4 text-base leading-8 text-muted">{page.summary}.</p>
                  {page.seo ? (
                    <p className="mt-3 text-sm leading-6 text-muted">
                      <span className="text-foreground">{seoTitle}</span>
                      <span aria-hidden> — </span>
                      {seoDescription}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-muted">Its search title and description are set in Settings.</p>
                  )}
                  <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted">{meta.join(" · ")}</p>
                </div>
                <DashboardResourceActions editHref={routes.dashboardItem("pages", key)} previewHref={page.path} />
              </div>
            </DashboardCard>
          );
        })}
      </section>
    </div>
  );
}
