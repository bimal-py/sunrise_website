import type { Metadata } from "next";
import Image from "next/image";
import { Clapperboard, Plus } from "lucide-react";
import { routes } from "@/lib/routes";
import { formatDate } from "@/lib/utils/date";
import { filmCategoryLabel } from "@/features/films/domain/entities";
import { deleteFilm } from "@/features/films/presentation/actions/films";
import { formatDuration } from "@/features/films/presentation/dashboard/film-editor-form";
import {
  FILM_ORDERS,
  FILM_SORTS,
  FILM_VIEWS,
  filmListHref,
  filmListParams,
  parseFilmListQuery,
} from "@/features/films/presentation/dashboard/film-list-query";
import { FilmSyncPanel } from "@/features/films/presentation/dashboard/film-sync-panel";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { DashboardButton } from "@/features/dashboard/presentation/components/ui/dashboard-button";
import { DashboardResourceActions } from "@/features/dashboard/presentation/components/ui/dashboard-resource-actions";
import { DashboardCard, DashboardEmptyState, DashboardNotice, StatusBadge } from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { DashboardFilterBar } from "@/features/dashboard/presentation/components/ui/filter-bar";
import { Pager } from "@/features/dashboard/presentation/components/ui/pager";

export const metadata: Metadata = { title: "Films" };
// The YouTube sync's actions run from this page: listing the channel and building thumbnails takes time.
export const maxDuration = 60;

const PAGE_SIZE = 20;
const COLUMNS = "youtube_id, slug, title, youtube_title, category, place, published_at, featured, hidden, curated, thumbnail, duration_seconds, age_restricted";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)?.slice(0, 200) ?? "";

export default async function DashboardFilmsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = parseFilmListQuery(params);
  const { supabase } = await requireAdmin();

  let list = supabase.from("films").select(COLUMNS, { count: "exact" });
  if (query.view === "visible") list = list.eq("hidden", false);
  if (query.view === "hidden") list = list.eq("hidden", true);
  if (query.view === "featured") list = list.eq("featured", true);
  if (query.view === "uncurated") list = list.eq("curated", false);
  // Characters that would break PostgREST's or() syntax are dropped from the search words.
  const term = query.q.replace(/[%,()"*\\]/g, " ").trim();
  if (term) list = list.or(`title.ilike.%${term}%,youtube_title.ilike.%${term}%,slug.ilike.%${term}%`);
  list = list
    .order(query.sort, { ascending: query.order === "asc" })
    .order("youtube_id")
    .range((query.page - 1) * PAGE_SIZE, query.page * PAGE_SIZE - 1);

  const head = { count: "exact" as const, head: true };
  const [{ data: films, count, error }, settings, total, visible, uncurated, featured, hidden] = await Promise.all([
    list,
    supabase.from("site_settings").select("youtube_url, youtube_channel_id, films_auto_publish, youtube_synced_at").eq("id", 1).maybeSingle(),
    supabase.from("films").select("youtube_id", head),
    supabase.from("films").select("youtube_id", head).eq("hidden", false),
    supabase.from("films").select("youtube_id", head).eq("curated", false),
    supabase.from("films").select("youtube_id", head).eq("featured", true),
    supabase.from("films").select("youtube_id", head).eq("hidden", true),
  ]);
  if (error) throw new Error(`Couldn't load the films: ${error.message}`);

  const counts: Record<string, number | null> = { all: total.count, visible: visible.count, uncurated: uncurated.count, featured: featured.count, hidden: hidden.count };
  const youtubeUrl = settings.data?.youtube_url?.trim() ?? "";
  const channelLink = /^https?:\/\//i.test(youtubeUrl) ? youtubeUrl : "";
  const hasChannel = Boolean(youtubeUrl) || /^UC[A-Za-z0-9_-]{22}$/.test(settings.data?.youtube_channel_id ?? "");
  const back = filmListParams(query);
  const editHref = (id: string) => `${routes.dashboardItem("films", id)}${back ? `?${new URLSearchParams({ back }).toString()}` : ""}`;

  const saved = one(params.saved);
  const moved = one(params.moved);
  const deleted = one(params.deleted);

  return (
    <div className="grid gap-8">
      <DashboardPageHeader
        eyebrow="Films"
        title="The studio's films, from YouTube."
        description="Every upload on the channel can come in with Sync. Check each new one's title and category (they're marked “Needs curating”); hidden films stay off the site."
        primaryAction={{ href: routes.dashboardNew("films"), label: "Add by link", icon: <Plus size={15} aria-hidden /> }}
      />

      {saved ? (
        <DashboardNotice>
          Saved “{saved}”.{moved ? ` Its old address now redirects to /films/${moved}.` : " The site shows it on the next visit."}
        </DashboardNotice>
      ) : null}
      {deleted ? <DashboardNotice>Deleted “{deleted}” from the site. Its address now sends visitors to the films page; it&apos;s still on YouTube.</DashboardNotice> : null}

      <FilmSyncPanel channelLink={channelLink} hasChannel={hasChannel} autoPublish={settings.data?.films_auto_publish ?? true} syncedAt={settings.data?.youtube_synced_at ?? null} />

      <DashboardFilterBar
        action={routes.dashboardSection("films")}
        search={{ name: "q", placeholder: "Title or YouTube title", defaultValue: query.q }}
        fields={[
          {
            name: "view",
            label: "View",
            options: FILM_VIEWS.map((option) => ({ value: option.value, label: counts[option.value] == null ? option.label : `${option.label} (${counts[option.value]})` })),
            defaultValue: query.view,
          },
          { name: "sort", label: "Sort by", options: [...FILM_SORTS], defaultValue: query.sort },
          { name: "order", label: "Order", options: [...FILM_ORDERS], defaultValue: query.order },
        ]}
      />

      {films.length === 0 ? (
        <DashboardEmptyState
          title={query.q ? "Nothing matches" : (total.count ?? 0) === 0 ? "No films yet" : "No films here"}
        >
          {query.q
            ? `No film's title matches “${query.q}”.`
            : (total.count ?? 0) === 0
              ? "Use Sync from YouTube above to bring in the channel's uploads, or add one with “Add by link”."
              : "No film fits this view. Choose View: All to see every film."}
        </DashboardEmptyState>
      ) : (
        <section className="grid gap-6" aria-label="Films">
          {films.map((film) => {
            const length = formatDuration(film.duration_seconds);
            return (
              <DashboardCard key={film.youtube_id} className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex w-full min-w-0 max-w-3xl flex-col gap-4 sm:w-auto sm:flex-row sm:items-start">
                    <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-card border border-line bg-raised sm:w-40">
                      {film.thumbnail ? (
                        <Image
                          src={film.thumbnail.src}
                          alt=""
                          fill
                          sizes="(min-width: 640px) 160px, 100vw"
                          placeholder={film.thumbnail.blurDataURL ? "blur" : "empty"}
                          blurDataURL={film.thumbnail.blurDataURL || undefined}
                          className="object-cover"
                        />
                      ) : (
                        <span className="absolute inset-0 grid place-items-center text-muted">
                          <Clapperboard size={20} aria-hidden />
                        </span>
                      )}
                      {length ? (
                        <span className="absolute bottom-1.5 right-1.5 rounded-full bg-background/85 px-2 py-0.5 font-mono text-[10px] leading-4 text-strong">{length}</span>
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="break-words font-display text-2xl font-semibold leading-tight text-strong">{film.title}</h2>
                        {film.featured ? <StatusBadge status="Featured" /> : null}
                        {film.hidden ? <StatusBadge status="Hidden" /> : null}
                        {!film.curated ? <StatusBadge tone="red">Needs curating</StatusBadge> : null}
                        {film.age_restricted ? <StatusBadge tone="neutral">Age-restricted</StatusBadge> : null}
                      </div>
                      <p className="mt-1 break-all font-mono text-xs text-muted">{routes.film(film.slug)}</p>
                      {film.youtube_title && film.youtube_title !== film.title ? (
                        <p className="mt-2 break-words text-sm text-muted">On YouTube as “{film.youtube_title}”</p>
                      ) : null}
                      <p className="mt-3 flex flex-wrap gap-x-2 text-sm text-muted">
                        <span>{filmCategoryLabel(film.category)}</span>
                        {film.place ? (
                          <>
                            <span aria-hidden>•</span>
                            <span>{film.place}</span>
                          </>
                        ) : null}
                        <span aria-hidden>•</span>
                        <time dateTime={film.published_at}>{formatDate(film.published_at)}</time>
                      </p>
                    </div>
                  </div>
                  <DashboardResourceActions
                    editHref={editHref(film.youtube_id)}
                    previewHref={film.hidden ? undefined : routes.film(film.slug)}
                    deleteAction={deleteFilm}
                    deleteFields={{ youtube_id: film.youtube_id, back }}
                    deleteConfirm={{
                      title: `Delete “${film.title}”?`,
                      message:
                        "It comes off the site (it stays on YouTube) and its address sends visitors to the films page. The next sync from YouTube brings it back: to keep it off the site, edit it and tick Hidden instead.",
                    }}
                  >
                    {film.hidden ? (
                      <DashboardButton href={routes.film(film.slug)} disabled title="Hidden films aren't on the site: untick Hidden to preview its page">
                        Preview
                      </DashboardButton>
                    ) : null}
                  </DashboardResourceActions>
                </div>
              </DashboardCard>
            );
          })}
        </section>
      )}

      <Pager page={query.page} total={count ?? films.length} pageSize={PAGE_SIZE} href={(page) => filmListHref({ ...query, page })} noun="films" />
    </div>
  );
}
