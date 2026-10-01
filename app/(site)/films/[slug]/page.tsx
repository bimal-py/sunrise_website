import type { Metadata } from "next";
import { filmRepository } from "@/features/films/data/films.repository";
import { filmDescription } from "@/features/films/domain/labels";
import { FilmDetailPageView } from "@/features/films/presentation/views/film-detail-page-view";
import { routes } from "@/lib/routes";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getSiteSettings } from "@/features/site/data/settings.repository";

type PageProps = { params: Promise<{ slug: string }> };

// No dynamicParams = false: a slug created in the dashboard after the last deploy renders on its first
// visit (then stays static until a save refreshes it); unknown slugs 404 or follow a saved redirect.

export async function generateStaticParams() {
  const films = await filmRepository.list();
  return films.map((film) => ({ slug: film.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [film, site] = await Promise.all([filmRepository.get(slug), getSiteSettings()]);
  if (!film) return { title: "Film not found" };
  return buildPageMetadata({
    title: film.seoTitle || film.title,
    description: film.seoDescription || filmDescription(film, site.name),
    path: routes.film(film.slug),
    image: film.thumbnail?.ogImage,
  });
}

export default async function FilmPage({ params }: PageProps) {
  const { slug } = await params;
  return <FilmDetailPageView slug={slug} />;
}
