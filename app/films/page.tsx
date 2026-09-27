import type { Metadata } from "next";
import { filmCategories, type FilmCategory } from "@/features/films/domain/entities";
import { FilmsIndexPageView } from "@/features/films/presentation/views/films-index-page-view";
import { routes } from "@/lib/routes";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { firstParam, type SearchParams } from "@/lib/utils/search-params";

type PageProps = { searchParams: Promise<SearchParams> };

function categoryParam(params: SearchParams): FilmCategory | undefined {
  const value = firstParam(params, "category");
  return filmCategories.find((c) => c.slug === value)?.slug;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  return buildPageMetadata({
    title: "Films: weddings, pasni, bratabandha and more",
    description: "Wedding films, ceremony films and cultural programmes filmed by Sunrise Photo Studio across Syangja, Nepal.",
    path: routes.films(),
    // Category views repeat films from /films: keep them out of the index.
    noindex: Boolean(firstParam(await searchParams, "category")),
  });
}

export default async function FilmsPage({ searchParams }: PageProps) {
  return <FilmsIndexPageView category={categoryParam(await searchParams)} />;
}
