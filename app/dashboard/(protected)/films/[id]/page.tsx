import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { routes } from "@/lib/routes";
import { FilmEditorForm } from "@/features/films/presentation/dashboard/film-editor-form";
import { filmListHref, filmListParams, parseFilmListQuery } from "@/features/films/presentation/dashboard/film-list-query";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { DashboardButton } from "@/features/dashboard/presentation/components/ui/dashboard-button";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { DashboardNotice } from "@/features/dashboard/presentation/components/ui/dashboard-ui";

export const metadata: Metadata = { title: "Edit film" };
// The thumbnail field can import a photo from a link (fetch + resize).
export const maxDuration = 60;

type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

export default async function EditFilmPage({ params, searchParams }: PageProps) {
  const [{ id }, search] = await Promise.all([params, searchParams]);
  // YouTube ids have nothing to decode; anything else isn't a film.
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const { data: film } = await supabase.from("films").select("*").eq("youtube_id", id).maybeSingle();
  if (!film) notFound();

  // The list (with its filters) this editor was opened from, to return to after saving.
  const backQuery = parseFilmListQuery(new URLSearchParams(one(search.back).slice(0, 500)));
  const back = filmListParams(backQuery);
  const added = one(search.added).slice(0, 200);

  return (
    <div className="grid gap-8">
      <DashboardPageHeader
        eyebrow="Films"
        title={`Edit: ${film.title}`}
        description={film.youtube_title && film.youtube_title !== film.title ? <>On YouTube as “{film.youtube_title}”.</> : "Update how the site shows this film. Saving refreshes the site straight away."}
        actions={
          <>
            <DashboardButton href={filmListHref(backQuery)}>Back to films</DashboardButton>
            <DashboardButton href={film.hidden ? `https://www.youtube.com/watch?v=${film.youtube_id}` : routes.film(film.slug)} newTab>
              {film.hidden ? "Watch on YouTube" : "Preview"}
            </DashboardButton>
          </>
        }
      />
      {added ? <DashboardNotice>Added “{added}”. Check its title, category and place, then save.</DashboardNotice> : null}
      {!film.curated && !added ? (
        <p className="rounded-card border border-primary/35 bg-primary-soft px-4 py-3 text-sm leading-6 text-muted">
          <span className="font-medium text-strong">Needs curating:</span> the title and category were guessed from YouTube. Check them (and add the place if you know it), then save.
        </p>
      ) : null}
      {film.age_restricted ? (
        <p className="rounded-card border border-error/50 bg-error/10 px-4 py-3 text-sm leading-6 text-muted">
          <span className="font-medium text-error">Age-restricted on YouTube:</span> its player asks viewers to sign in to confirm their age, so it won&apos;t play on this site for most visitors.
          {film.hidden ? " That's why it came in hidden." : ""}
        </p>
      ) : null}
      <FilmEditorForm film={film} back={back} />
    </div>
  );
}
