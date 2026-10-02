import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { PickableFilm } from "@/features/dashboard/presentation/components/film-picker";

/** Films with a still, newest first, for the cover / mock-up pickers. */
export async function pickableFilms(db: SupabaseClient<Database>): Promise<PickableFilm[]> {
  const { data } = await db.from("films").select("youtube_id, title, thumbnail").eq("hidden", false).not("thumbnail", "is", null).order("published_at", { ascending: false });
  return (data ?? []).map((film) => ({ id: film.youtube_id, title: film.title, thumbnail: film.thumbnail }));
}

/** The next free place at the end of a list. */
export async function nextSortOrder(db: SupabaseClient<Database>, table: "services" | "prints" | "reviews"): Promise<number> {
  const { data } = await db.from(table).select("sort_order").order("sort_order", { ascending: false }).limit(1);
  return (data?.[0]?.sort_order ?? 0) + 10;
}
