import "server-only";
import type { Film } from "@/features/films/domain/entities";
import curation from "@/data/films/curation.json";
import type { BuiltImageDto, FilmCurationDto, YouTubeVideoDto } from "./dto";
import images from "./generated/images.json";
import videos from "./generated/videos.json";
import { toFilm } from "./mappers";

const curated = curation as unknown as Record<string, FilmCurationDto>;
const built = images as Record<string, BuiltImageDto>;

/**
 * Offline fallback (no Supabase env): the YouTube snapshot + curation that seeded the
 * database. Every visible film, newest first; slugs made unique by appending the video id.
 */
export const staticFilms: Film[] = (() => {
  const seen = new Set<string>();
  return (videos as YouTubeVideoDto[])
    .filter((video) => !curated[video.id]?.hidden)
    .map((video) => toFilm(video, curated[video.id], built[video.id]))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .map((film) => {
      const slug = seen.has(film.slug) ? `${film.slug}-${film.id.toLowerCase()}` : film.slug;
      seen.add(slug);
      return { ...film, slug };
    });
})();
