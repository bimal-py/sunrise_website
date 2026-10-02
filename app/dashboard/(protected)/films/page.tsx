import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { routes } from "@/lib/routes";
import { formatDate } from "@/lib/utils/date";
import { filmCategoryLabel } from "@/features/films/domain/entities";
import { syncFromYouTube, toggleFilm } from "@/features/films/presentation/actions/films";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { QuietSubmit } from "@/features/dashboard/presentation/components/form-controls";
import { InlineAction } from "@/features/dashboard/presentation/components/inline-action";
import { ListChips, ListSearch } from "@/features/dashboard/presentation/components/list-chips";
import { PageHeader, Pager, rowLinkClass, StatusBadge } from "@/features/dashboard/presentation/components/ui";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { SpriteButton } from "@/shared/components/ui/sprite-button";

export const metadata: Metadata = { title: "Films" };
// Syncing builds thumbnails for new uploads: give the action time.
export const maxDuration = 60;

const PAGE_SIZE = 20;
const VIEWS = [
  { id: "all", label: "All" },
  { id: "visible", label: "On the site" },
  { id: "uncurated", label: "Needs curating" },
  { id: "featured", label: "Featured" },
  { id: "hidden", label: "Hidden" },
] as const;
type View = (typeof VIEWS)[number]["id"];

type PageProps = { searchParams: Promise<{ view?: string; q?: string; page?: string }> };

export default async function DashboardFilmsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const view: View = VIEWS.some((v) => v.id === params.view) ? (params.view as View) : "all";
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "", 10) || 1);
  const { supabase } = await requireAdmin();

  let query = supabase
    .from("films")
    .select("youtube_id, slug, title, category, published_at, featured, hidden, curated, thumbnail", { count: "exact" })
    .order("published_at", { ascending: false })
    .order("youtube_id")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (view === "visible") query = query.eq("hidden", false);
  if (view === "hidden") query = query.eq("hidden", true);
  if (view === "featured") query = query.eq("featured", true);
  if (view === "uncurated") query = query.eq("curated", false);
  if (q) query = query.or(`title.ilike.%${q.replace(/[%,()]/g, " ")}%,youtube_title.ilike.%${q.replace(/[%,()]/g, " ")}%`);
  const { data: films, count, error } = await query;
  if (error) throw new Error(`Couldn't load films: ${error.message}`);

  const href = (next: { view?: View; page?: number }) => {
    const search = new URLSearchParams();
    const v = next.view ?? view;
    if (v !== "all") search.set("view", v);
    if (q) search.set("q", q);
    if (next.page && next.page > 1) search.set("page", String(next.page));
    const query = search.toString();
    return `${routes.dashboardSection("films")}${query ? `?${query}` : ""}`;
  };

  return (
    <>
      <PageHeader
        eyebrow="Films"
        title="Films"
        description="The studio's YouTube uploads, as the site shows them. New uploads come in with Sync; give them a proper title and category."
        actions={
          <>
            <InlineAction action={syncFromYouTube} label="Sync from YouTube" pendingLabel="Syncing…" />
            <SpriteButton href={routes.dashboardNew("films")}>
              <Plus className="h-4 w-4" aria-hidden /> Add by link
            </SpriteButton>
          </>
        }
      />
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <ListChips label="Film filters" items={VIEWS.map((v) => ({ href: href({ view: v.id }), label: v.label, active: view === v.id }))} />
        <ListSearch action={routes.dashboardSection("films")} q={q} placeholder="Search films…" hidden={view !== "all" ? { view } : {}} />
      </div>

      {films.length === 0 ? (
        <EmptyState title="No films here">{q ? "Nothing matches that search." : "Use Sync from YouTube to bring in the channel's uploads."}</EmptyState>
      ) : (
        <ul className="divide-y divide-line rounded-panel border border-line bg-surface">
          {films.map((film) => (
            <li key={film.youtube_id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5">
              <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-card bg-raised sm:w-36">
                {film.thumbnail && (
                  <Image src={film.thumbnail.src} alt="" fill sizes="144px" placeholder="blur" blurDataURL={film.thumbnail.blurDataURL} className="object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={routes.dashboardItem("films", film.youtube_id)} className="font-medium text-strong hover:text-primary">
                  {film.title}
                </Link>
                <p className="mt-0.5 text-sm text-muted">
                  {filmCategoryLabel(film.category)} · {formatDate(film.published_at)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {film.featured && <StatusBadge tone="gold">Featured</StatusBadge>}
                  {film.hidden && <StatusBadge>Hidden</StatusBadge>}
                  {!film.curated && <StatusBadge tone="red">Needs curating</StatusBadge>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <Link href={routes.dashboardItem("films", film.youtube_id)} className={rowLinkClass}>
                  Edit
                </Link>
                {!film.hidden && (
                  <a href={routes.film(film.slug)} target="_blank" rel="noopener noreferrer" className={rowLinkClass}>
                    View <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                  </a>
                )}
                <form action={toggleFilm}>
                  <input type="hidden" name="youtube_id" value={film.youtube_id} />
                  <input type="hidden" name="field" value="featured" />
                  <input type="hidden" name="value" value={String(!film.featured)} />
                  <QuietSubmit>{film.featured ? "Unfeature" : "Feature"}</QuietSubmit>
                </form>
                <form action={toggleFilm}>
                  <input type="hidden" name="youtube_id" value={film.youtube_id} />
                  <input type="hidden" name="field" value="hidden" />
                  <input type="hidden" name="value" value={String(!film.hidden)} />
                  <QuietSubmit>{film.hidden ? "Show" : "Hide"}</QuietSubmit>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pager page={page} total={count ?? films.length} pageSize={PAGE_SIZE} href={(p) => href({ page: p })} noun="films" />
    </>
  );
}
