import type { Film, FilmCategory } from "@/features/films/domain/entities";
import { slugify } from "@/lib/utils/slug";
import type { BuiltImageDto, FilmCurationDto, YouTubeVideoDto } from "./dto";

const WEDDING = /\bweds?\b|wedding|marriage|bibaha|biwaha|विवाह|बिबाह|बिहे/i;
const CEREMONY = /puja|pooja|पुजा|पूजा|bart?abandha|bratabandha|ब्रतबन्ध|बर्तबन्ध|pasni|पास्नी|rice feeding|chaurasi|चौरासी|kul ?puja|कुलपूजा|naming|nwaran|न्वारान|janku|जन्कु/i;
const CULTURE = /mela|मेला|sabha|सभा|programm?e?\b|festival|महोत्सव|dance|नाच|competition|प्रतियोगिता|school|विद्यालय|tournament|volleyball|भलिबल|rally|teej|tij|तिज|मन्दिर|temple|shilanyas|शिलान्यास|panchebaja|पञ्चे ?बाजा|naumati|नौमती|गाउँपालिका|गाँउपालिका|गाउँपालीका/i;

/**
 * Uncurated uploads: "x weds y" is a wedding, a puja, bratabandha or pasni a ceremony, a
 * mela, programme or competition culture; anything else a ceremony until someone files it.
 */
export function guessCategory(title: string): FilmCategory {
  if (WEDDING.test(title)) return "weddings";
  if (CEREMONY.test(title)) return "ceremonies";
  if (CULTURE.test(title)) return "culture";
  return "ceremonies";
}

/** "SAGAR WEDS ASMITA" → "Sagar weds Asmita" (only used when curation has no title). */
export function tidyTitle(title: string): string {
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
