import type { Metadata } from "next";
import { AboutPageView } from "@/features/site/presentation/views/about-page-view";
import { routes } from "@/lib/routes";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: "About the studio",
    description:
      "Sunrise Photo Studio is a photo and film studio in Arjunchaupari, Syangja, covering weddings, pasni, bratabandha and family celebrations, with albums and prints made in the studio.",
    path: routes.about(),
    page: "about",
  });
}

export default function AboutPage() {
  return <AboutPageView />;
}
