import type { FilmRow } from "@/lib/supabase/types";
import { filmCategories } from "@/features/films/domain/entities";
import { saveFilm } from "@/features/films/presentation/actions/films";
import { DashboardForm } from "@/features/dashboard/presentation/components/ui/dashboard-form";
import {
  DashboardCheckbox,
  DashboardField,
  DashboardInput,
  DashboardSelect,
  DashboardTextarea,
  fieldLabelClass,
} from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { ImageUrlField } from "@/features/dashboard/presentation/components/ui/image-url-field";

/** Values shown for reference only: dashed and dimmed, so they don't read as fields to fill in. */
const READ_ONLY = "cursor-default border-dashed";

/** 7113 → "1:58:33", 95 → "1:35". */
export function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/**
 * The film editor, in the portfolio's form card: the site's title, slug, category, place and
 * date; what YouTube says (id, length, age check, its own title and description: read only);
 * the thumbnail; Featured and Hidden; the SEO block. `back` is the list (with its filters)
 * the save returns to.
 */
export function FilmEditorForm({ film, back }: { film: FilmRow; back: string }) {
  const length = formatDuration(film.duration_seconds);
  return (
    <DashboardForm action={saveFilm} submitLabel="Save film">
      <input type="hidden" name="youtube_id" value={film.youtube_id} />
      <input type="hidden" name="back" value={back} />

      <div className="grid gap-5 md:grid-cols-2">
        <DashboardField label="Title" required help="How the site names the film: cards, its page and search results. Keep couples' names as the studio spells them." example="Sagar weds Asmita">
          <DashboardInput name="title" defaultValue={film.title} maxLength={200} placeholder="Title" />
        </DashboardField>
        <DashboardField
          label="Slug"
          help="The film page's address: lowercase words joined by hyphens. Changing it adds a redirect from the old address, so links keep working."
          example="sagar-weds-asmita"
          hint={`/films/${film.slug}`}
        >
          <DashboardInput name="slug" defaultValue={film.slug} maxLength={120} placeholder="Slug" spellCheck={false} autoCapitalize="none" autoComplete="off" />
        </DashboardField>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <DashboardField label="Category" required help="Where the film is filed on the films page, and which service page shows it.">
          <DashboardSelect name="category" defaultValue={film.category}>
            {filmCategories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.label}
              </option>
            ))}
          </DashboardSelect>
        </DashboardField>
        <DashboardField label="Place" help="Where it was filmed, when you know it. Shown on the film's page." example="Panchamul">
          <DashboardInput name="place" defaultValue={film.place} maxLength={120} placeholder="Place (optional)" />
        </DashboardField>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <DashboardField label="Published date" required help="The day it went up on YouTube (in Nepal's time). The films list and the home page show the newest first.">
          <DashboardInput name="published_at" type="date" defaultValue={film.published_at} style={{ colorScheme: "dark" }} />
        </DashboardField>
        <DashboardField label="YouTube id" help="The video's id on YouTube. It can't change: to show a different video, add it by link.">
          <DashboardInput value={film.youtube_id} readOnly className={`${READ_ONLY} font-mono text-muted!`} />
        </DashboardField>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <DashboardField label="Length" help="From YouTube, read when the film came in. Search engines show it beside the video.">
          <DashboardInput value={length || "Not known"} readOnly className={`${READ_ONLY} font-mono text-muted!`} />
        </DashboardField>
        <DashboardField
          label="Age check on YouTube"
          help="YouTube asks viewers to sign in to confirm their age for some videos. Those won't play in the site's player for most visitors, so the sync brings them in hidden."
        >
          <DashboardInput
            value={film.age_restricted ? "Age-restricted: won't play here for most visitors" : "None"}
            readOnly
            className={`${READ_ONLY} ${film.age_restricted ? "text-error!" : "text-muted!"}`}
          />
        </DashboardField>
      </div>

      <ImageUrlField
        name="thumbnail"
        label="Thumbnail"
        collection="films"
        defaultValue={film.thumbnail}
        help="The still on the film's card, behind its player and on link previews. It came from YouTube; choose another photo to replace it."
        hint="Any photo works: the usual sizes are made from it."
      />

      <details className="min-w-0 rounded-card border border-line-strong bg-raised px-4 py-3">
        <summary className={`cursor-pointer select-none py-1 ${fieldLabelClass}`}>On YouTube (read only)</summary>
        <div className="mt-4 grid gap-5 pb-1">
          <DashboardField label="YouTube title">
            <DashboardInput value={film.youtube_title || "(none)"} readOnly className={`${READ_ONLY} text-muted!`} />
          </DashboardField>
          <DashboardField label="YouTube description" hint="Shown here for reference; the site doesn't use it.">
            <DashboardTextarea value={film.youtube_description || "(none)"} readOnly rows={6} className={`${READ_ONLY} text-muted!`} />
          </DashboardField>
        </div>
      </details>

      <div className="flex flex-wrap gap-x-8">
        <DashboardCheckbox name="featured" label="Featured (show on home)" defaultChecked={film.featured} hint="Shown first on the home page's film strip." />
        <DashboardCheckbox name="hidden" label="Hidden" defaultChecked={film.hidden} hint="Kept off the site: its page, the lists and the sitemap. The next sync won't bring it back." />
      </div>

      <details className="min-w-0 rounded-card border border-line-strong bg-raised px-4 py-3">
        <summary className={`cursor-pointer select-none py-1 ${fieldLabelClass}`}>SEO &amp; social (optional)</summary>
        <div className="mt-4 grid gap-5 pb-1">
          <p className="text-xs leading-5 text-muted">Leave any field blank to use the automatic value. Link previews use the thumbnail above.</p>
          <DashboardField label="SEO title" help="The title Google and the browser tab show. Blank uses the film's title." example="Sagar weds Asmita: wedding film, Syangja" hint="Best at 50–60 characters.">
            <DashboardInput name="seo_title" defaultValue={film.seo_title} maxLength={120} placeholder={film.title || "SEO title (optional)"} />
          </DashboardField>
          <DashboardField
            label="SEO description"
            help="The short text under the title in Google results. Blank uses a sentence made from the title, category and place."
            hint="Best at about 150 characters."
          >
            <DashboardTextarea name="seo_description" rows={2} defaultValue={film.seo_description} maxLength={300} placeholder="SEO description (optional)" />
          </DashboardField>
        </div>
      </details>
    </DashboardForm>
  );
}
