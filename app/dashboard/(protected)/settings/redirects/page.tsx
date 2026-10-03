import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { routes } from "@/lib/routes";
import { formatDate } from "@/lib/utils/date";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { DashboardButton } from "@/features/dashboard/presentation/components/ui/dashboard-button";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { DashboardResourceActions } from "@/features/dashboard/presentation/components/ui/dashboard-resource-actions";
import { DashboardCard, DashboardEmptyState, DashboardNotice, StatusBadge } from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { DashboardFilterBar } from "@/features/dashboard/presentation/components/ui/filter-bar";
import { Pager } from "@/features/dashboard/presentation/components/ui/pager";
import { deleteRedirect } from "@/features/redirects/presentation/actions/redirects";
import { SpriteButton } from "@/shared/components/ui/sprite-button";

export const metadata: Metadata = { title: "Redirects" };

const PAGE_SIZE = 25;

type Search = Record<string, string | string[] | undefined>;
type PageProps = { searchParams: Promise<Search> };

/** The first value of a search param, trimmed ("" when missing). */
function param(search: Search, key: string): string {
  const value = search[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export default async function RedirectsPage({ searchParams }: PageProps) {
  const search = await searchParams;
  const type = ["permanent", "temporary"].includes(param(search, "type")) ? param(search, "type") : "";
  const sort = param(search, "sort") === "source" ? "source" : "";
  const q = param(search, "q").slice(0, 100);
  const page = Math.max(1, Number.parseInt(param(search, "page"), 10) || 1);
  const saved = param(search, "saved");
  const deleted = param(search, "deleted");
  const when = param(search, "when");
  const { supabase } = await requireAdmin();

  let query = supabase.from("redirects").select("id, source, destination, permanent, note, created_at", { count: "exact" });
  if (type) query = query.eq("permanent", type === "permanent");
  // Characters PostgREST reads as syntax inside or() are dropped from the search words.
  const term = q.replace(/[%,()"\\*:]/g, " ").trim();
  if (term) query = query.or(`source.ilike.%${term}%,destination.ilike.%${term}%,note.ilike.%${term}%`);
  query = sort === "source" ? query.order("source") : query.order("created_at", { ascending: false }).order("source");
  const { data: redirects, count, error } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw new Error(`Couldn't load the redirects: ${error.message}`);

  const list = `${routes.dashboardSection("settings")}/redirects`;
  const filtered = Boolean(type || term);
  const pageHref = (to: number) => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (sort) params.set("sort", sort);
    if (q) params.set("q", q);
    if (to > 1) params.set("page", String(to));
    const text = params.toString();
    return text ? `${list}?${text}` : list;
  };

  return (
    <div className="grid gap-8">
      <DashboardPageHeader
        eyebrow="Settings"
        title="Redirects"
        description="Send visitors and search engines from an old address to its new one, so old links and search results keep working. Renaming or removing a film, service, print, product or post adds one by itself."
        primaryAction={{ href: `${list}/new`, label: "Add redirect" }}
        actions={<DashboardButton href={routes.dashboardSection("settings")}>← Settings</DashboardButton>}
      />

      {saved ? (
        <DashboardNotice>
          Saved the redirect from <span className="break-all font-mono">{saved}</span>.{" "}
          {when === "now" ? "It works now." : when === "deploy" ? "It starts working after the site's next deploy." : ""}
        </DashboardNotice>
      ) : null}
      {deleted ? (
        <DashboardNotice>
          Deleted the redirect from <span className="break-all font-mono">{deleted}</span>.
        </DashboardNotice>
      ) : null}

      <DashboardFilterBar
        action={list}
        search={{ name: "q", placeholder: "Search addresses and notes…", defaultValue: q }}
        fields={[
          {
            name: "type",
            label: "Type",
            defaultValue: type,
            options: [
              { value: "", label: "All" },
              { value: "permanent", label: "Permanent" },
              { value: "temporary", label: "Temporary" },
            ],
          },
          {
            name: "sort",
            label: "Sort by",
            defaultValue: sort,
            options: [
              { value: "", label: "Newest first" },
              { value: "source", label: "Old address, A–Z" },
            ],
          },
        ]}
      />

      {redirects.length === 0 ? (
        <DashboardEmptyState
          title={filtered ? "Nothing matches" : page > 1 ? "Nothing on this page" : "No redirects yet"}
          action={filtered ? undefined : <SpriteButton href={`${list}/new`}>Add redirect</SpriteButton>}
        >
          {filtered ? "Try other words, or set Type back to All." : "Renaming a film, service, print, product or post adds one here by itself. Add one by hand for an old address from before."}
        </DashboardEmptyState>
      ) : (
        <section className="grid gap-6" aria-label="Redirects">
          {redirects.map((r) => (
            <DashboardCard key={r.id} className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="break-all font-mono text-lg font-medium text-strong">{r.source}</h2>
                    <StatusBadge tone={r.permanent ? "neutral" : "gold"}>{r.permanent ? "Permanent" : "Temporary"}</StatusBadge>
                  </div>
                  <p className="mt-2 flex min-w-0 items-start gap-2 font-mono text-sm text-foreground">
                    <ArrowRight size={15} className="mt-0.5 shrink-0 text-primary" aria-hidden />
                    <span className="sr-only">redirects to</span>
                    <span className="break-all">{r.destination}</span>
                  </p>
                  {r.note ? <p className="mt-4 text-base leading-8 text-muted">{r.note}</p> : null}
                  <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted">Added {formatDate(r.created_at)}</p>
                </div>
                <DashboardResourceActions
                  editHref={`${list}/${r.id}`}
                  deleteAction={deleteRedirect}
                  deleteFields={{ id: r.id }}
                  deleteConfirm={{ title: `Delete the redirect from ${r.source}?`, message: "Old links to it will stop working. This can't be undone." }}
                >
                  {/* Opens the old address, to check where it lands. */}
                  <DashboardButton href={r.source} newTab prefetch={false}>
                    Test
                  </DashboardButton>
                </DashboardResourceActions>
              </div>
            </DashboardCard>
          ))}
        </section>
      )}

      <Pager page={page} total={count ?? redirects.length} pageSize={PAGE_SIZE} href={pageHref} noun="redirects" />
    </div>
  );
}
