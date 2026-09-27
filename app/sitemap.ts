import type { MetadataRoute } from "next";
import { blogRepository } from "@/features/blog/data/blog.repository";
import { filmRepository } from "@/features/films/data/films.repository";
import { printRepository } from "@/features/prints/data/prints.repository";
import { serviceRepository } from "@/features/services/data/services.repository";
import { absoluteUrl } from "@/lib/seo/metadata";
import { routes } from "@/lib/routes";

// Canonical, indexable URLs only: no filtered ?category= / ?tag= views.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, prints, films, posts] = await Promise.all([
    serviceRepository.list(),
    printRepository.list(),
    filmRepository.list(),
    blogRepository.listPosts(),
  ]);
  return [
    { url: absoluteUrl(routes.home()), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl(routes.services()), changeFrequency: "monthly", priority: 0.9 },
    ...services.map((s) => ({ url: absoluteUrl(routes.service(s.slug)), changeFrequency: "monthly" as const, priority: 0.8 })),
    { url: absoluteUrl(routes.prints()), changeFrequency: "monthly", priority: 0.8 },
    ...prints.map((p) => ({ url: absoluteUrl(routes.print(p.slug)), changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: absoluteUrl(routes.films()), changeFrequency: "weekly", priority: 0.8 },
    ...films.map((f) => ({ url: absoluteUrl(routes.film(f.slug)), lastModified: f.publishedAt, priority: 0.6 })),
    { url: absoluteUrl(routes.blog()), changeFrequency: "weekly", priority: 0.7 },
    ...posts.map((p) => ({ url: absoluteUrl(routes.post(p.slug)), lastModified: p.updatedAt ?? p.publishedAt, priority: 0.6 })),
    { url: absoluteUrl(routes.about()), changeFrequency: "yearly", priority: 0.5 },
    { url: absoluteUrl(routes.contact()), changeFrequency: "yearly", priority: 0.8 },
    { url: absoluteUrl(routes.privacy()), changeFrequency: "yearly", priority: 0.1 },
  ];
}
