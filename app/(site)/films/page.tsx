import type { Metadata } from "next";
import { FilmsIndexPageView } from "@/features/films/presentation/views/films-index-page-view";
import { routes } from "@/lib/routes";
import { buildPageMetadata } from "@/lib/seo/metadata";

// Static: ?category= views are the same file filtered in the browser, and canonical to /films.
export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: "Films: weddings, pasni, bratabandha and more",
    description: "Wedding films, ceremony films and cultural programmes filmed by Sunrise Photo Studio across Syangja, Nepal.",
    path: routes.films(),
    page: "films",
  });
}

export default function FilmsPage() {
  return <FilmsIndexPageView />;
}
