"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TAG } from "@/lib/cache/tags";
import { processImage, uniqueImageName } from "@/lib/media/process-image";
import { routes } from "@/lib/routes";
import { notifyIndexNow } from "@/lib/seo/indexnow";
import type { Database, FilmCategoryValue } from "@/lib/supabase/types";
import { requireAdminAction } from "@/features/dashboard/data/auth";
import { bool, image, str } from "@/features/dashboard/data/form";
import { recordMove, SLUG_PATTERN, uniqueSlug } from "@/features/dashboard/data/slugs";
import type { ActionState } from "@/features/dashboard/presentation/components/form-controls";
import { guessCategory, tidyTitle } from "@/features/films/data/mappers";
import { fetchChannelFeed, fetchThumbnail, fetchVideo, parseYouTubeId, type YouTubeVideo } from "@/features/films/data/youtube";

type Db = SupabaseClient<Database>;
const CATEGORIES: FilmCategoryValue[] = ["weddings", "ceremonies", "culture"];
/** New films per sync: each needs its thumbnail built, so a big backlog is added over a few clicks. */
const SYNC_BATCH = 6;

/** Films show on the home page, service pages and in stills: refresh everything that reads them. */
function refreshFilmPages() {
  updateTag(TAG.films);
}

/** Adds a YouTube upload as an uncurated film (tidied title, guessed category, built thumbnail). */
async function importVideo(db: Db, video: YouTubeVideo): Promise<string> {
  const title = tidyTitle(video.title || video.id);
  const slug = await uniqueSlug(db, "films", title || video.id.toLowerCase());
  let thumbnail = null;
  try {
    const { mediaId: _id, ...asset } = await processImage(db, await fetchThumbnail(video.id), { collection: "films", name: uniqueImageName(video.id), trimBars: true });
    void _id;
    thumbnail = asset;
  } catch (error) {
    console.error(`[films] thumbnail for ${video.id}`, error);
  }
  const { error } = await db.from("films").insert({
    youtube_id: video.id,
    slug,
    title,
    youtube_title: video.title,
    youtube_description: video.description,
    category: guessCategory(video.title),
    published_at: video.publishedAt || new Date().toISOString().slice(0, 10),
    curated: false,
    thumbnail,
  });
  if (error) throw new Error(error.message);
  return slug;
}

/** Fetch the channel's newest uploads and add the ones the site doesn't have yet. */
export async function syncFromYouTube(): Promise<ActionState> {
  const { supabase } = await requireAdminAction();
  const { data: settings } = await supabase.from("site_settings").select("youtube_channel_id").eq("id", 1).single();
  if (!settings?.youtube_channel_id) return { status: "error", message: "Add the YouTube channel id in Settings → Social profiles first." };

  try {
    const feed = await fetchChannelFeed(settings.youtube_channel_id);
    const { data: existing } = await supabase.from("films").select("youtube_id").in("youtube_id", feed.map((v) => v.id));
    const known = new Set((existing ?? []).map((row) => row.youtube_id));
    const fresh = feed.filter((video) => !known.has(video.id));

    // Keep YouTube's own title/description current for films already on the site.
    for (const video of feed.filter((v) => known.has(v.id))) {
      await supabase.from("films").update({ youtube_title: video.title, youtube_description: video.description }).eq("youtube_id", video.id);
    }
    const batch = fresh.slice(0, SYNC_BATCH);
    const added: string[] = [];
    for (const video of batch) added.push(await importVideo(supabase, video));

    if (added.length === 0) return { status: "success", message: "Up to date: every film in the channel's feed is already here." };
    refreshFilmPages();
    notifyIndexNow([routes.films(), ...added.map((slug) => routes.film(slug))]);
    const more = fresh.length - batch.length;
    return {
      status: "success",
      message: `Added ${added.length} new film${added.length === 1 ? "" : "s"}${more > 0 ? ` (${more} more: sync again)` : ""}. Check their titles and categories (marked “Needs curating”).`,
    };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "The sync failed." };
  }
}

/** Add one video by its link or id (older uploads aren't in the channel's feed). */
export async function addFilm(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdminAction();
  const id = parseYouTubeId(str(formData, "video", 300));
  if (!id) return { status: "error", message: "Paste a YouTube link (youtube.com/watch?v=… or youtu.be/…) or a video id." };
  const { count } = await supabase.from("films").select("youtube_id", { count: "exact", head: true }).eq("youtube_id", id);
  if (count) return { status: "error", message: "That film is already on the site." };

  let slug: string;
  try {
    slug = await importVideo(supabase, await fetchVideo(id));
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Couldn't add that video." };
  }
  refreshFilmPages();
  notifyIndexNow([routes.films(), routes.film(slug)]);
  redirect(routes.dashboardItem("films", id));
}

export async function saveFilm(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "youtube_id", 20);
  const { data: current } = await supabase.from("films").select("slug, hidden").eq("youtube_id", id).single();
  if (!current) return { status: "error", message: "That film no longer exists." };

  const title = str(formData, "title", 200);
  const slugInput = str(formData, "slug", 120).toLowerCase();
  const category = str(formData, "category", 20) as FilmCategoryValue;
  const publishedAt = str(formData, "published_at", 10);
  const problems: string[] = [];
  if (!title) problems.push("The film needs a title.");
  if (!CATEGORIES.includes(category)) problems.push("Choose a category.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publishedAt)) problems.push("Give the date it was published (YYYY-MM-DD).");
  if (slugInput && !SLUG_PATTERN.test(slugInput)) problems.push("The address may only use lowercase letters, digits and single hyphens.");
  if (problems.length) return { status: "error", message: problems.join(" ") };

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
      thumbnail: image(formData, "thumbnail"),
      seo_title: str(formData, "seo_title", 120),
      seo_description: str(formData, "seo_description", 300),
    })
    .eq("youtube_id", id);
  if (error) return { status: "error", message: `Couldn't save: ${error.message}` };

  if (slug !== current.slug) {
    await recordMove(supabase, routes.film(current.slug), routes.film(slug), `Film renamed`);
    updateTag(TAG.redirects);
  }
  refreshFilmPages();
  if (!hidden) notifyIndexNow([routes.film(slug), routes.films()]);
  return { status: "success", message: slug !== current.slug ? `Saved. The old address now redirects to /films/${slug}.` : "Saved. The site shows it on the next visit." };
}

/** Quick switches from the list: hide/show, feature/unfeature. */
export async function toggleFilm(formData: FormData) {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "youtube_id", 20);
  const field = str(formData, "field", 20);
  const value = formData.get("value") === "true";
  if (field !== "hidden" && field !== "featured") throw new Error("Bad request.");
  const { error } = await supabase.from("films").update(field === "hidden" ? { hidden: value } : { featured: value }).eq("youtube_id", id);
  if (error) throw new Error(error.message);
  refreshFilmPages();
  refresh();
}

/** Remove a film from the site; its address then sends visitors to /films (no 404 for old links). */
export async function deleteFilm(formData: FormData) {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "youtube_id", 20);
  const { data: film } = await supabase.from("films").select("slug").eq("youtube_id", id).single();
  const { error } = await supabase.from("films").delete().eq("youtube_id", id);
  if (error) throw new Error(error.message);
  if (film) await recordMove(supabase, routes.film(film.slug), routes.films(), "Film removed");
  updateTag(TAG.films);
  updateTag(TAG.redirects);
  updateTag(TAG.services);
  updateTag(TAG.prints);
  redirect(routes.dashboardSection("films"));
}
