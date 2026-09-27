import "server-only";
import type { Film } from "@/features/films/domain/entities";
import type { FilmRepository } from "@/features/films/domain/repositories";
import curation from "@/data/films/curation.json";
import type { BuiltImageDto, FilmCurationDto, YouTubeVideoDto } from "./dto";
import images from "./generated/images.json";
import videos from "./generated/videos.json";
import { toFilm } from "./mappers";

const curated = curation as unknown as Record<string, FilmCurationDto>;
const built = images as Record<string, BuiltImageDto>;

/** Every visible film, newest first. Slugs are made unique by appending the video id. */
const all: Film[] = (() => {
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

export const filmRepository: FilmRepository = {
  async list({ category, limit } = {}) {
    const films = category ? all.filter((f) => f.category === category) : all;
    return limit ? films.slice(0, limit) : films;
  },

  async listHighlights(limit) {
    return [...all.filter((f) => f.featured), ...all.filter((f) => !f.featured)].slice(0, limit);
  },

  async get(slug) {
    return all.find((f) => f.slug === slug) ?? null;
  },

  async listRelated(film, limit) {
    const others = all.filter((f) => f.id !== film.id);
    return [...others.filter((f) => f.category === film.category), ...others.filter((f) => f.category !== film.category)].slice(0, limit);
  },
};
