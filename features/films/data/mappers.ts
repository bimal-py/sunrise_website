import type { Film, FilmCategory } from "@/features/films/domain/entities";
import { slugify } from "@/lib/utils/slug";
import type { BuiltImageDto, FilmCurationDto, YouTubeVideoDto } from "./dto";

/** Uncurated uploads: "x weds y" is a wedding, anything else a ceremony until someone files it. */
function guessCategory(title: string): FilmCategory {
  return /\bweds?\b|wedding|bibaha|विवाह/i.test(title) ? "weddings" : "ceremonies";
}

/** "SAGAR WEDS ASMITA" → "Sagar weds Asmita" (only used when curation has no title). */
function tidyTitle(title: string): string {
  const letters = title.replace(/[^A-Za-z]/g, "");
  const shouting = letters.length > 0 && letters === letters.toUpperCase();
  const lower = shouting || title === title.toLowerCase() ? title.toLowerCase() : title;
  return lower
    .split(/\s+/)
    .map((word) => (word === "weds" || word === "and" ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ");
}

export function toFilm(video: YouTubeVideoDto, curation: FilmCurationDto | undefined, image: BuiltImageDto | undefined): Film {
  const title = curation?.title ?? tidyTitle(video.title);
  return {
    id: video.id,
    slug: slugify(title) || video.id.toLowerCase(),
    title,
    youtubeTitle: video.title,
    category: curation?.category ?? guessCategory(video.title),
    place: curation?.place ?? null,
    publishedAt: video.publishedAt,
    featured: curation?.featured ?? false,
    thumbnail: image
      ? {
          src: `/images/films/${video.id}.webp`,
          width: image.width,
          height: image.height,
          blurDataURL: image.blurDataURL,
          ogImage: `/images/films/og/${video.id}.jpg`,
        }
      : null,
    watchUrl: `https://www.youtube.com/watch?v=${video.id}`,
    // youtube-nocookie: no YouTube cookies until the visitor presses play.
    embedUrl: `https://www.youtube-nocookie.com/embed/${video.id}`,
  };
}
