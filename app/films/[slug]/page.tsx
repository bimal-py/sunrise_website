import type { Metadata } from "next";
import { filmRepository } from "@/features/films/data/films.repository";
import { filmDescription } from "@/features/films/domain/labels";
import { FilmDetailPageView } from "@/features/films/presentation/views/film-detail-page-view";
import { routes } from "@/lib/routes";
import { buildPageMetadata } from "@/lib/seo/metadata";

type PageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export async function generateStaticParams() {
  const films = await filmRepository.list();
  return films.map((film) => ({ slug: film.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const film = await filmRepository.get(slug);
  if (!film) return { title: "Film not found" };
  return buildPageMetadata({
    title: film.title,
    description: filmDescription(film),
    path: routes.film(film.slug),
    image: film.thumbnail?.ogImage,
  });
}

export default async function FilmPage({ params }: PageProps) {
  const { slug } = await params;
  return <FilmDetailPageView slug={slug} />;
}
