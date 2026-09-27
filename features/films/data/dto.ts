import type { FilmCategory } from "@/features/films/domain/entities";

/** One video in generated/videos.json (written by scripts/fetch-youtube.py). */
export type YouTubeVideoDto = {
  id: string;
  title: string;
  publishedAt: string;
  description: string;
};

/** One entry of data/films/curation.json (hand-edited). */
export type FilmCurationDto = {
  title?: string;
  category?: FilmCategory;
  place?: string;
  featured?: boolean;
  hidden?: boolean;
};

export type BuiltImageDto = { width: number; height: number; blurDataURL: string };
