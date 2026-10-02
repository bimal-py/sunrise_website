import type { MetadataRoute } from "next";
import { blogRepository } from "@/features/blog/data/blog.repository";
import { filmRepository } from "@/features/films/data/films.repository";
import { filmDescription } from "@/features/films/domain/labels";
import { printRepository } from "@/features/prints/data/prints.repository";
import { serviceRepository } from "@/features/services/data/services.repository";
import { getPage } from "@/features/site/data/pages.repository";
import { getSiteSettings } from "@/features/site/data/settings.repository";
import type { PageKey } from "@/lib/supabase/types";
import { absoluteUrl } from "@/lib/seo/metadata";
import { routes } from "@/lib/routes";

// Built on every request instead of cached: a crawler's fetch is cheap (it reads the same
// tagged data cache as the pages, no rebuild), and the sitemap can never go stale. The
// portfolio's statically cached sitemap went stale on Vercel.
export const dynamic = "force-dynamic";

const PAGE_KEYS: PageKey[] = ["home", "services", "prints", "films", "blogs", "about", "contact", "privacy"];

const ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };

/** Next 16 writes sitemap values into the XML as they are, so text and URLs are escaped here. */
function xml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => ENTITIES[char]);
}

const url = (path: string) => xml(absoluteUrl(path));

/** The latest of some dates (ISO timestamps or YYYY-MM-DD), as written; undefined if none. */
function newest(...dates: (string | null | undefined)[]): string | undefined {
  let latest: string | undefined;
  for (const date of dates) {
    if (date && !Number.isNaN(Date.parse(date)) && (!latest || Date.parse(date) > Date.parse(latest))) latest = date;
  }
  return latest;
}

// Canonical, indexable URLs only: no filtered ?category= / ?tag= views. Each page is dated
// by its own last change, an index by its newest item (or its copy, if edited later).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [site, services, prints, films, posts, pages] = await Promise.all([
    getSiteSettings(),
    serviceRepository.list(),
    printRepository.list(),
    filmRepository.list(),
    blogRepository.listPosts(),
    Promise.all(PAGE_KEYS.map((key) => getPage(key))),
  ]);
  const edited = Object.fromEntries(pages.map((page) => [page.key, page.updatedAt])) as Record<PageKey, string | null>;
  const serviceDates = services.map((s) => s.updatedAt);
  const printDates = prints.map((p) => p.updatedAt);
  const filmDates = films.map((f) => f.updatedAt ?? f.publishedAt);
  const postDates = posts.map((p) => p.updatedAt ?? p.publishedAt);

  return [
    { url: url(routes.home()), lastModified: newest(edited.home, ...filmDates, ...serviceDates, ...printDates), changeFrequency: "weekly", priority: 1 },
    { url: url(routes.services()), lastModified: newest(edited.services, ...serviceDates), changeFrequency: "monthly", priority: 0.9 },
    ...services.map((s) => ({ url: url(routes.service(s.slug)), lastModified: newest(s.updatedAt), changeFrequency: "monthly" as const, priority: 0.8 })),
    { url: url(routes.prints()), lastModified: newest(edited.prints, ...printDates), changeFrequency: "monthly", priority: 0.8 },
    ...prints.map((p) => ({ url: url(routes.print(p.slug)), lastModified: newest(p.updatedAt), changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: url(routes.films()), lastModified: newest(edited.films, ...filmDates), changeFrequency: "weekly", priority: 0.8 },
    ...films.map((f) => ({
      url: url(routes.film(f.slug)),
      lastModified: newest(f.updatedAt, f.publishedAt),
      priority: 0.6,
      ...(f.thumbnail && {
        images: [url(f.thumbnail.ogImage)],
        videos: [
          {
            title: xml(f.title),
            thumbnail_loc: url(f.thumbnail.ogImage),
            description: xml(filmDescription(f, site.name)),
            player_loc: xml(f.embedUrl),
            publication_date: f.publishedAt,
          },
        ],
      }),
    })),
    { url: url(routes.blog()), lastModified: newest(edited.blogs, ...postDates), changeFrequency: "weekly", priority: 0.7 },
    ...posts.map((p) => ({
      url: url(routes.post(p.slug)),
      lastModified: newest(p.updatedAt, p.publishedAt),
      priority: 0.6,
      ...(p.coverImage && { images: [url(p.coverImage.ogImage)] }),
    })),
    { url: url(routes.about()), lastModified: newest(edited.about), changeFrequency: "yearly", priority: 0.5 },
    { url: url(routes.contact()), lastModified: newest(edited.contact), changeFrequency: "yearly", priority: 0.8 },
    { url: url(routes.privacy()), lastModified: newest(edited.privacy), changeFrequency: "yearly", priority: 0.1 },
  ];
}
