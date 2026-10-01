import type { ImageAsset } from "@/shared/domain/image";

export type FilmCategory = "weddings" | "ceremonies" | "culture";

export const filmCategories: { slug: FilmCategory; label: string; labelNe: string }[] = [
  { slug: "weddings", label: "Weddings", labelNe: "विवाह" },
  { slug: "ceremonies", label: "Ceremonies", labelNe: "संस्कार" },
  { slug: "culture", label: "Culture and events", labelNe: "संस्कृति" },
];

export function filmCategoryLabel(category: FilmCategory): string {
  return filmCategories.find((c) => c.slug === category)?.label ?? category;
}

/** A film's thumbnail: pre-built sizes (scripts/optimize-images.py, or the dashboard's YouTube sync). */
export type FilmImage = ImageAsset;

/** A film from the studio's YouTube channel, as the site shows it. */
export type Film = {
  /** YouTube video id. */
  id: string;
  slug: string;
  /** Title as the site names it (data/films/curation.json), falling back to YouTube's. */
  title: string;
  /** The title on YouTube, kept for reference and search. */
  youtubeTitle: string;
  category: FilmCategory;
  /** Where it was filmed, when known. */
  place: string | null;
  /** YYYY-MM-DD upload date. */
  publishedAt: string;
  featured: boolean;
  thumbnail: FilmImage | null;
  /** Dashboard SEO overrides; empty = the generated title and description. */
  seoTitle?: string;
  seoDescription?: string;
  /** When the film's page last changed (sitemap lastmod). */
  updatedAt?: string | null;
  watchUrl: string;
  embedUrl: string;
};
