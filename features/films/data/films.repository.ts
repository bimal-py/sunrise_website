import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { TAG } from "@/lib/cache/tags";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { readClient } from "@/lib/supabase/read-client";
import type { FilmRow } from "@/lib/supabase/types";
import type { Film } from "@/features/films/domain/entities";
import type { FilmRepository } from "@/features/films/domain/repositories";
import { staticFilms } from "./films.static";

const COLUMNS = "youtube_id, slug, title, youtube_title, category, place, published_at, featured, thumbnail, seo_title, seo_description, updated_at";

export function rowToFilm(row: Pick<FilmRow, "youtube_id" | "slug" | "title" | "youtube_title" | "category" | "place" | "published_at" | "featured" | "thumbnail" | "seo_title" | "seo_description" | "updated_at">): Film {
  return {
    id: row.youtube_id,
    slug: row.slug,
    title: row.title,
    youtubeTitle: row.youtube_title,
    category: row.category,
    place: row.place || null,
    publishedAt: row.published_at,
    featured: row.featured,
    thumbnail: row.thumbnail,
    watchUrl: `https://www.youtube.com/watch?v=${row.youtube_id}`,
    // youtube-nocookie: no YouTube cookies until the visitor presses play.
    embedUrl: `https://www.youtube-nocookie.com/embed/${row.youtube_id}`,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    updatedAt: row.updated_at,
  };
}

// The whole (small) list in one cache entry, tagged "films", no timer: pages that show films
// are rebuilt only when the dashboard saves a film. Lookups by slug read this same entry, so
// a bot guessing slugs can't create a cache entry per guess.
const loadFilms = unstable_cache(
  async (): Promise<Film[]> => {
    const { data, error } = await readClient()
      .from("films")
      .select(COLUMNS)
      .eq("hidden", false)
      .order("published_at", { ascending: false })
      .order("youtube_id");
    if (error) throw new Error(`films: ${error.message}`);
    return data.map(rowToFilm);
  },
  ["films"],
  { tags: [TAG.films] },
);

/** Every visible film, newest first (per-request memo over the tagged cache). */
const all = cache(async (): Promise<Film[]> => (isSupabaseConfigured ? loadFilms() : staticFilms));

export const filmRepository: FilmRepository = {
  async list({ category, limit } = {}) {
    const films = (await all()).filter((f) => !category || f.category === category);
    return limit ? films.slice(0, limit) : films;
  },

  async listHighlights(limit) {
    const films = await all();
    return [...films.filter((f) => f.featured), ...films.filter((f) => !f.featured)].slice(0, limit);
  },

  async get(slug) {
    return (await all()).find((f) => f.slug === slug) ?? null;
  },

  async listRelated(film, limit) {
    const others = (await all()).filter((f) => f.id !== film.id);
    return [...others.filter((f) => f.category === film.category), ...others.filter((f) => f.category !== film.category)].slice(0, limit);
  },
};
