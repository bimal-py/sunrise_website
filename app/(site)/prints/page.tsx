import type { Metadata } from "next";
import { PrintsIndexPageView } from "@/features/prints/presentation/views/prints-index-page-view";
import { routes } from "@/lib/routes";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: "Prints: premium albums, photo frames and canvas",
    description:
      "Premium wedding albums, photo frames, canvas prints, photo books and photo prints, designed and printed at Sunrise Photo Studio in Arjunchaupari, Syangja.",
    path: routes.prints(),
    page: "prints",
  });
}

export default function PrintsPage() {
  return <PrintsIndexPageView />;
}
