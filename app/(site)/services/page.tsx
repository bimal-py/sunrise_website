import type { Metadata } from "next";
import { ServicesIndexPageView } from "@/features/services/presentation/views/services-index-page-view";
import { routes } from "@/lib/routes";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: "Services: wedding photos, films, pasni and portraits",
    description:
      "Wedding photography and films, pre-wedding shoots, pasni and bratabandha, studio portraits, events and passport photos in Arjunchaupari, Syangja.",
    path: routes.services(),
    page: "services",
  });
}

export default function ServicesPage() {
  return <ServicesIndexPageView />;
}
