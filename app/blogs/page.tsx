import type { Metadata } from "next";
import { BlogIndexPageView } from "@/features/blog/presentation/views/blog-index-page-view";
import { routes } from "@/lib/routes";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { firstParam, type SearchParams } from "@/lib/utils/search-params";

type PageProps = { searchParams: Promise<SearchParams> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  return buildPageMetadata({
    title: "Blog: guides to wedding photos, ceremonies and prints",
    description: "Planning wedding photos and films in Nepal, what to capture at a pasni or bratabandha, and choosing print sizes, frames and albums.",
    path: routes.blog(),
    // Topic-filtered views repeat posts from /blogs: keep them out of the index.
    noindex: Boolean(firstParam(await searchParams, "tag")),
  });
}

export default async function BlogsPage({ searchParams }: PageProps) {
  const tag = firstParam(await searchParams, "tag");
  return <BlogIndexPageView tag={tag} />;
}
