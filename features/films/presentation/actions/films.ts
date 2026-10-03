"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TAG } from "@/lib/cache/tags";
import { processImage, uniqueImageName } from "@/lib/media/process-image";
import { routes } from "@/lib/routes";
import { notifyIndexNow } from "@/lib/seo/indexnow";
import type { Database, FilmCategoryValue } from "@/lib/supabase/types";
import { slugify } from "@/lib/utils/slug";
import type { ImageAsset } from "@/shared/domain/image";
import { requireAdminAction } from "@/features/dashboard/data/auth";
import { bool, str } from "@/features/dashboard/data/form";
import { readImageField } from "@/features/dashboard/data/offering-form";
import { recordMove, SLUG_PATTERN, uniqueSlug } from "@/features/dashboard/data/slugs";
import type { ActionState } from "@/features/dashboard/presentation/components/ui/action-state";
import { guessCategory, tidyTitle } from "@/features/films/data/mappers";
import {
  fetchThumbnail,
  fetchVideoDetails,
  isChannelId,
  isVideoId,
  kathmanduToday,
  listAllUploads,
  parseYouTubeId,
  resolveChannelId,
  YouTubeError,
  type ChannelUpload,
  type UploadSource,
  type VideoDetails,
} from "@/features/films/data/youtube";
import { filmListHref, parseFilmListQuery } from "@/features/films/presentation/dashboard/film-list-query";

type Db = SupabaseClient<Database>;

const CATEGORIES: FilmCategoryValue[] = ["weddings", "ceremonies", "culture"];
/** New films per call of the sync loop: each needs its thumbnail built, so a big backlog comes in over many calls. */
const SYNC_BATCH = 8;
/** Imports running side by side within one call. */
const SYNC_CONCURRENCY = 2;
/** After this long, a call stops starting new imports and hands the rest back (the page allows 60 s). */
const BATCH_TIME_MS = 30_000;
/** Time for listing the channel (a few seconds for hundreds of uploads; the cap matters only for huge channels). */
const LIST_TIME_MS = 30_000;

// ---------------------------------------------------------------------------------------------
// Shapes the sync panel reads
// ---------------------------------------------------------------------------------------------

export type FilmSyncStart =
  | {
      ok: true;
      /** Uploads not on the site yet (Shorts left out), newest first. */
      pending: string[];
      /** Uploads found on the channel. */
      uploads: number;
      /** Of those, already on the site. */
      onSite: number;
      /** Shorts that aren't on the site (they're skipped). */
      shorts: number;
      source: UploadSource;
      /** False when the channel's list was cut short (very long, YouTube slow, or only the feed answered). */
      complete: boolean;
      autoPublish: boolean;
    }
  | { ok: false; message: string };

export type FilmSyncItem = {
  id: string;
  /** deferred = not tried (the call ran out of time): send it again. */
  status: "added" | "skipped" | "failed" | "deferred";
  title?: string;
  hidden?: boolean;
  note?: string;
};

export type FilmSyncBatch = { ok: true; items: FilmSyncItem[] } | { ok: false; message: string };
export type FilmSyncFinish = { ok: true; syncedAt: string } | { ok: false; message: string };

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------

/** A failure as one sentence for the owner. */
function failure(error: unknown, fallback = "The sync stopped unexpectedly. Try again."): string {
  if (error instanceof YouTubeError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/** `fn` over `items`, at most `limit` at a time, results in the items' order. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * The channel the sync reads: the YouTube link in Settings resolved to its id (stored when it
 * changed), else the id stored before. Throws YouTubeError when there's neither.
 */
async function syncChannel(db: Db): Promise<{ channelId: string; autoPublish: boolean }> {
  const { data: settings, error } = await db.from("site_settings").select("youtube_url, youtube_channel_id, films_auto_publish").eq("id", 1).maybeSingle();
  if (error) throw new Error(`Couldn't read the settings: ${error.message}`);
  const stored = settings?.youtube_channel_id ?? "";
  const link = settings?.youtube_url?.trim() ?? "";
  let channelId = stored;
  if (link) {
    try {
      channelId = await resolveChannelId(link);
    } catch (resolveError) {
      // YouTube may just be slow: carry on with the id found last time, if there is one.
      if (!isChannelId(stored)) throw resolveError;
    }
  }
  if (!isChannelId(channelId)) throw new YouTubeError("Add the channel's YouTube link in Settings → YouTube first.");
  // Not shown on public pages, so the site's cache needn't be refreshed for it.
  if (channelId !== stored) await db.from("site_settings").update({ youtube_channel_id: channelId }).eq("id", 1);
  return { channelId, autoPublish: settings?.films_auto_publish ?? true };
}

/** Every film's YouTube id and YouTube title (paged: the API returns at most 1,000 rows at a time). */
async function filmsOnSite(db: Db): Promise<Map<string, string>> {
  const known = new Map<string, string>();
  for (let from = 0; from < 50_000; from += 1000) {
    const { data, error } = await db.from("films").select("youtube_id, youtube_title").order("youtube_id").range(from, from + 999);
    if (error) throw new Error(`Couldn't read the films: ${error.message}`);
    for (const row of data) known.set(row.youtube_id, row.youtube_title);
    if (data.length < 1000) break;
  }
  return known;
}

/** Keeps the YouTube title of films already on the site in step with the channel (the site's own title isn't touched). Returns how many changed. */
async function refreshYouTubeTitles(db: Db, uploads: ChannelUpload[], known: Map<string, string>): Promise<number> {
  const changed = uploads.filter((upload) => upload.title && known.has(upload.id) && known.get(upload.id) !== upload.title).slice(0, 100);
  await mapLimit(changed, 4, async (upload) => {
    await db.from("films").update({ youtube_title: upload.title }).eq("youtube_id", upload.id);
  });
  return changed.length;
}

/** The video's biggest thumbnail as a library photo (black letterbox bars cut), or null if it can't be built. */
async function buildThumbnail(db: Db, id: string, title: string): Promise<ImageAsset | null> {
  try {
    const { mediaId: _mediaId, ...asset } = await processImage(db, await fetchThumbnail(id), {
      collection: "films",
      name: uniqueImageName(id),
      alt: title.slice(0, 300),
      trimBars: true,
    });
    void _mediaId;
    return asset;
  } catch (error) {
    console.error(`[films] thumbnail for ${id}`, error);
    return null;
  }
}

/**
 * Adds a YouTube upload as an uncurated film: tidied title, guessed category, the day it was
 * published in Kathmandu, its length and age flag, and its thumbnail. Null when it was added
 * meanwhile (another sync).
 */
async function importVideo(db: Db, video: VideoDetails, { hidden }: { hidden: boolean }): Promise<{ slug: string; title: string } | null> {
  const title = (tidyTitle(video.title) || video.id).slice(0, 200);
  // Nepali titles have no latin letters for a slug: use the video's id instead.
  const base = slugify(title) ? title : `film ${video.id}`;
  let slug = await uniqueSlug(db, "films", base);
  const row = {
    youtube_id: video.id,
    title,
    youtube_title: video.title.slice(0, 500),
    youtube_description: video.description.slice(0, 5000),
    category: guessCategory(video.title),
    place: "",
    published_at: video.publishedAt || kathmanduToday(),
    featured: false,
    hidden,
    curated: false,
    duration_seconds: video.durationSeconds,
    age_restricted: video.ageRestricted,
    thumbnail: await buildThumbnail(db, video.id, title),
  };
  let { error } = await db.from("films").insert({ ...row, slug });
  if (error?.code === "23505" && /slug/i.test(`${error.message} ${error.details ?? ""}`)) {
    // Two uploads with the same title, imported side by side: the second gets its id on the end.
    slug = `${slug.slice(0, 100)}-${slugify(video.id)}`.slice(0, 120).replace(/-+$/, "");
    ({ error } = await db.from("films").insert({ ...row, slug }));
  }
  if (error?.code === "23505") return null;
  if (error) throw new Error(`Couldn't save the film: ${error.message}`);
  return { slug, title };
}

/** Where a save or delete returns to: the films list with the filters it came from (`back`), plus a notice. */
function listHref(formData: FormData, notice: Record<string, string>): string {
  return filmListHref(parseFilmListQuery(new URLSearchParams(str(formData, "back", 500).replace(/^\?/, ""))), notice);
}

// ---------------------------------------------------------------------------------------------
// Sync from YouTube (the panel calls start, then batches until done, then finish)
// ---------------------------------------------------------------------------------------------

/** Lists the channel's uploads and returns the ones the site doesn't have yet. */
export async function startFilmSync(): Promise<FilmSyncStart> {
  try {
    const { supabase } = await requireAdminAction();
    const { channelId, autoPublish } = await syncChannel(supabase);
    const [list, known] = await Promise.all([listAllUploads(channelId, { timeBudgetMs: LIST_TIME_MS }), filmsOnSite(supabase)]);
    // The YouTube title is only shown here in the dashboard, so the public pages needn't be rebuilt for it.
    await refreshYouTubeTitles(supabase, list.uploads, known);
    const fresh = list.uploads.filter((upload) => !known.has(upload.id));
    return {
      ok: true,
      pending: fresh.filter((upload) => !upload.short).map((upload) => upload.id),
      uploads: list.uploads.length,
      onSite: list.uploads.length - fresh.length,
      shorts: fresh.filter((upload) => upload.short).length,
      source: list.source,
      complete: list.complete,
      autoPublish,
    };
  } catch (error) {
    return { ok: false, message: failure(error) };
  }
}

/**
 * Imports up to 8 of the given uploads (each checked again on the server: a video id, from
 * the channel in Settings, not on the site yet, not a Short, already published). Age-restricted
 * films come in hidden; the others visible or hidden per Settings → YouTube.
 */
export async function importFilmsBatch(ids: string[]): Promise<FilmSyncBatch> {
  try {
    const { supabase } = await requireAdminAction();
    const wanted = [...new Set((Array.isArray(ids) ? ids : []).filter((id): id is string => typeof id === "string" && isVideoId(id)))].slice(0, SYNC_BATCH);
    if (wanted.length === 0) return { ok: true, items: [] };

    const { data: settings } = await supabase.from("site_settings").select("youtube_channel_id, films_auto_publish").eq("id", 1).maybeSingle();
    const channelId = settings?.youtube_channel_id ?? "";
    if (!isChannelId(channelId)) return { ok: false, message: "Add the channel's YouTube link in Settings → YouTube first." };
    const autoPublish = settings?.films_auto_publish ?? true;

    const { data: existing, error } = await supabase.from("films").select("youtube_id").in("youtube_id", wanted);
    if (error) throw new Error(`Couldn't read the films: ${error.message}`);
    const known = new Set((existing ?? []).map((row) => row.youtube_id));
    const deadline = Date.now() + BATCH_TIME_MS;
    const added: { slug: string; hidden: boolean }[] = [];

    const items = await mapLimit(wanted, SYNC_CONCURRENCY, async (id): Promise<FilmSyncItem> => {
      if (known.has(id)) return { id, status: "skipped", note: "Already on the site." };
      if (Date.now() > deadline) return { id, status: "deferred" };
      try {
        const video = await fetchVideoDetails(id);
        if (video.channelId && video.channelId !== channelId) return { id, status: "skipped", title: video.title, note: "It's on another channel." };
        if (video.short) return { id, status: "skipped", title: video.title, note: "A Short." };
        if (video.notYetPublished) return { id, status: "skipped", title: video.title, note: "Not out yet (a premiere or a live stream); a later sync brings it in." };
        const hidden = video.ageRestricted || !autoPublish;
        const film = await importVideo(supabase, video, { hidden });
        if (!film) return { id, status: "skipped", title: video.title, note: "Already on the site." };
        added.push({ slug: film.slug, hidden });
        return { id, status: "added", title: film.title, hidden, note: video.ageRestricted ? "Age-restricted on YouTube, so it came in hidden." : undefined };
      } catch (importError) {
        return { id, status: "failed", note: failure(importError, "Couldn't add it.") };
      }
    });

    if (added.length > 0) {
      updateTag(TAG.films);
      const visible = added.filter((film) => !film.hidden).map((film) => routes.film(film.slug));
      if (visible.length > 0) notifyIndexNow([routes.films(), ...visible]);
    }
    return { ok: true, items };
  } catch (error) {
    return { ok: false, message: failure(error) };
  }
}

/** Notes when the channel was last synced in full. */
export async function finishFilmSync(): Promise<FilmSyncFinish> {
  try {
    const { supabase } = await requireAdminAction();
    const syncedAt = new Date().toISOString();
    // Not shown on public pages, so the site's cache needn't be refreshed for it.
    const { error } = await supabase.from("site_settings").update({ youtube_synced_at: syncedAt }).eq("id", 1);
    if (error) throw new Error(`Couldn't note the sync: ${error.message}`);
    return { ok: true, syncedAt };
  } catch (error) {
    return { ok: false, message: failure(error) };
  }
}

// ---------------------------------------------------------------------------------------------
// One film
// ---------------------------------------------------------------------------------------------

/** Add one video by its link or id (any upload, even one the sync skips, like a Short). */
export async function addFilm(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdminAction();
  const id = parseYouTubeId(str(formData, "video", 500));
  if (!id) return { status: "error", message: "Paste a YouTube video link (youtube.com/watch?v=…, youtu.be/… or a Shorts link) or the video's id." };
  const { count } = await supabase.from("films").select("youtube_id", { count: "exact", head: true }).eq("youtube_id", id);
  if (count) return { status: "error", message: "That film is already on the site: find it in the list (search its title)." };

  let film: { slug: string; title: string } | null;
  let hidden = false;
  try {
    const video = await fetchVideoDetails(id);
    if (video.notYetPublished) return { status: "error", message: "That video isn't out yet (a premiere or a live stream). Add it once it's been published." };
    hidden = video.ageRestricted;
    film = await importVideo(supabase, video, { hidden });
  } catch (error) {
    return { status: "error", message: failure(error, "Couldn't add that video.") };
  }
  if (!film) return { status: "error", message: "That film was just added. Find it in the list." };
  updateTag(TAG.films);
  if (!hidden) notifyIndexNow([routes.films(), routes.film(film.slug)]);
  redirect(`${routes.dashboardItem("films", id)}?${new URLSearchParams({ added: film.title }).toString()}`);
}

/** Save the film editor, then return to the list (with the filters it came from). */
export async function saveFilm(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "youtube_id", 20);
  if (!isVideoId(id)) return { status: "error", message: "That film no longer exists." };
  const { data: current } = await supabase.from("films").select("slug, hidden, thumbnail").eq("youtube_id", id).maybeSingle();
  if (!current) return { status: "error", message: "That film no longer exists. It may have been deleted." };

  const title = str(formData, "title", 200);
  const slugInput = str(formData, "slug", 120).toLowerCase();
  const category = str(formData, "category", 20) as FilmCategoryValue;
  const publishedAt = str(formData, "published_at", 10);
  const problems: string[] = [];
  if (!title) problems.push("Give the film a title.");
  if (!CATEGORIES.includes(category)) problems.push("Choose a category.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publishedAt) || Number.isNaN(Date.parse(publishedAt))) problems.push("Give the day it was published.");
  if (slugInput && !SLUG_PATTERN.test(slugInput)) problems.push("The slug may only use lowercase letters, digits and single hyphens.");
  const thumbnail = await readImageField(supabase, formData, "thumbnail", current.thumbnail);
  if (!thumbnail.ok) problems.push(`Thumbnail: ${thumbnail.error}`);
  if (problems.length || !thumbnail.ok) return { status: "error", message: problems.join(" ") };

  const slug = slugInput && slugInput !== current.slug ? await uniqueSlug(supabase, "films", slugInput, current.slug) : current.slug;
  const hidden = bool(formData, "hidden");
  const { error } = await supabase
    .from("films")
    .update({
      title,
      slug,
      category,
      place: str(formData, "place", 120),
      published_at: publishedAt,
      featured: bool(formData, "featured"),
      hidden,
      curated: true,
      thumbnail: thumbnail.image,
      seo_title: str(formData, "seo_title", 120),
      seo_description: str(formData, "seo_description", 300),
    })
    .eq("youtube_id", id);
  if (error) return { status: "error", message: `Couldn't save the film: ${error.message}` };

  if (slug !== current.slug) {
    await recordMove(supabase, routes.film(current.slug), routes.film(slug), "Film renamed");
    updateTag(TAG.redirects);
  }
  // Films show on the home page, the films pages and service pages: all read the "films" tag.
  updateTag(TAG.films);
  // Hiding is news too: search engines drop the page sooner.
  if (!hidden || !current.hidden) notifyIndexNow([routes.film(slug), routes.films()]);
  redirect(listHref(formData, slug !== current.slug ? { saved: title, moved: slug } : { saved: title }));
}

/** Remove a film from the site (it stays on YouTube); its address then sends visitors to /films. */
export async function deleteFilm(formData: FormData) {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "youtube_id", 20);
  if (!isVideoId(id)) throw new Error("That film no longer exists.");
  const { data: film } = await supabase.from("films").select("slug, title, hidden").eq("youtube_id", id).maybeSingle();
  if (!film) redirect(listHref(formData, {}));

  // Prints that showed its still drop it (a service's still is cleared by the database).
  const { data: prints } = await supabase.from("prints").select("id, preview_film_ids").contains("preview_film_ids", [id]);
  await Promise.all(
    (prints ?? []).map((print) =>
      supabase
        .from("prints")
        .update({ preview_film_ids: print.preview_film_ids.filter((filmId) => filmId !== id) })
        .eq("id", print.id),
    ),
  );
  const { error } = await supabase.from("films").delete().eq("youtube_id", id);
  if (error) throw new Error(`Couldn't delete the film: ${error.message}`);
  await recordMove(supabase, routes.film(film.slug), routes.films(), "Film removed");
  updateTag(TAG.films);
  updateTag(TAG.redirects);
  updateTag(TAG.services);
  updateTag(TAG.prints);
  if (!film.hidden) notifyIndexNow([routes.film(film.slug), routes.films()]);
  redirect(listHref(formData, { deleted: film.title }));
}
