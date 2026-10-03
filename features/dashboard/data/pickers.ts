import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { PickableFilm } from "@/features/dashboard/presentation/components/film-picker";

/**
 * Films on the site that have a still, newest first, for the cover / mock-up pickers (a
 * hidden film's still can't show on the site, so hidden films aren't offered).
 */
export async function pickableFilms(db: SupabaseClient<Database>): Promise<PickableFilm[]> {
  const { data } = await db
    .from("films")
    .select("youtube_id, title, thumbnail")
    .eq("hidden", false)
    .not("thumbnail", "is", null)
    .order("published_at", { ascending: false })
    .order("youtube_id")
    .limit(5000);
  // The blur placeholder is left out: the picker's tiles are small and the list can be long.
  return (data ?? []).map((film) => ({ id: film.youtube_id, title: film.title, thumbnail: film.thumbnail ? { ...film.thumbnail, blurDataURL: "" } : null }));
}

/** The next free place at the end of a list. */
export async function nextSortOrder(db: SupabaseClient<Database>, table: "services" | "prints" | "reviews"): Promise<number> {
  const { data } = await db.from(table).select("sort_order").order("sort_order", { ascending: false }).limit(1);
  return (data?.[0]?.sort_order ?? 0) + 10;
}
