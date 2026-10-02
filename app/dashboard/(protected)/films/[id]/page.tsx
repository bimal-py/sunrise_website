import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { routes } from "@/lib/routes";
import { filmCategories } from "@/features/films/domain/entities";
import { deleteFilm, saveFilm } from "@/features/films/presentation/actions/films";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { ActionForm } from "@/features/dashboard/presentation/components/action-form";
import { ConfirmSubmit } from "@/features/dashboard/presentation/components/form-controls";
import { ImageField } from "@/features/dashboard/presentation/components/image-field";
import { Checkbox, Field, inputClass, PageHeader, Panel, rowLinkClass, selectClass, StatusBadge, textareaClass } from "@/features/dashboard/presentation/components/ui";

export const metadata: Metadata = { title: "Edit film" };

type PageProps = { params: Promise<{ id: string }> };

export default async function EditFilmPage({ params }: PageProps) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: film } = await supabase.from("films").select("*").eq("youtube_id", decodeURIComponent(id)).maybeSingle();
  if (!film) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Films"
        title={film.title}
        description={<>On YouTube as “{film.youtube_title}”.</>}
        actions={
          <div className="flex flex-wrap items-center gap-4">
            <a href={routes.dashboardSection("films")} className={rowLinkClass}>
              ← All films
            </a>
            <a href={film.hidden ? `https://www.youtube.com/watch?v=${film.youtube_id}` : routes.film(film.slug)} target="_blank" rel="noopener noreferrer" className={rowLinkClass}>
              {film.hidden ? "Watch on YouTube" : "View on the site"} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>
        }
      />
      {!film.curated && (
        <p className="mb-5 rounded-card border border-error/40 px-4 py-3 text-sm text-strong">
          <StatusBadge tone="red">Needs curating</StatusBadge> <span className="ml-2">The title and category were guessed from YouTube. Check them and save.</span>
        </p>
      )}

      <Panel>
        <ActionForm action={saveFilm}>
          <input type="hidden" name="youtube_id" value={film.youtube_id} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Title on the site" htmlFor="title" hint="Keep couples' names as the studio spells them." className="sm:col-span-2">
              <input id="title" name="title" required maxLength={200} defaultValue={film.title} className={inputClass} />
            </Field>
            <Field label="Address" htmlFor="slug" hint={`/films/${film.slug}. Changing it adds a redirect from the old address.`}>
              <input id="slug" name="slug" defaultValue={film.slug} className={inputClass} />
            </Field>
            <Field label="Category" htmlFor="category">
              <select id="category" name="category" defaultValue={film.category} className={selectClass}>
                {filmCategories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Where it was filmed" htmlFor="place" hint="Village or town, when known (e.g. Panchamul).">
              <input id="place" name="place" defaultValue={film.place} className={inputClass} />
            </Field>
            <Field label="Published on" htmlFor="published_at">
              <input id="published_at" name="published_at" type="date" required defaultValue={film.published_at} className={inputClass} />
            </Field>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <Checkbox name="featured" label="Featured" defaultChecked={film.featured} hint="Shown first on the home page's film strip." />
              <Checkbox name="hidden" label="Hidden" defaultChecked={film.hidden} hint="Kept off the site (its page, lists and sitemap)." />
            </div>
            <div className="sm:col-span-2">
              <ImageField name="thumbnail" label="Thumbnail" collection="films" defaultValue={film.thumbnail} hint="From YouTube; upload a still to replace it." />
            </div>
          </div>

          <details className="rounded-card border border-line p-4">
            <summary className="cursor-pointer text-sm font-medium text-strong">Search engines (optional)</summary>
            <div className="mt-4 grid gap-5">
              <Field label="Search title" htmlFor="seo_title" hint="Empty = the film's title. About 50–60 characters.">
                <input id="seo_title" name="seo_title" maxLength={120} defaultValue={film.seo_title} className={inputClass} />
              </Field>
              <Field label="Search description" htmlFor="seo_description" hint="Empty = a sentence built from the title, category and place. About 150 characters.">
                <textarea id="seo_description" name="seo_description" rows={2} maxLength={300} defaultValue={film.seo_description} className={textareaClass} />
              </Field>
            </div>
          </details>
        </ActionForm>
      </Panel>

      <Panel title="Remove this film" description="Hiding it is usually better. Removing deletes it from the site; its address then sends visitors to the films page." className="mt-6">
        <form action={deleteFilm}>
          <input type="hidden" name="youtube_id" value={film.youtube_id} />
          <ConfirmSubmit confirm={`Remove “${film.title}” from the site? This can't be undone (it stays on YouTube).`}>Remove film</ConfirmSubmit>
        </form>
      </Panel>
    </>
  );
}
