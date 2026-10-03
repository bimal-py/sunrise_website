import type { Metadata } from "next";
import { merchandiseRepository } from "@/features/merchandise/data/merchandise.repository";
import { MerchandiseIndexPageView } from "@/features/merchandise/presentation/views/merchandise-index-page-view";
import { getPageDefinition } from "@/features/site/domain/page-content";
import { routes } from "@/lib/routes";
import { buildPageMetadata } from "@/lib/seo/metadata";

// Static: ?category= and ?q= views are the same file filtered in the browser, and canonical to /merchandise.
export async function generateMetadata(): Promise<Metadata> {
  const products = await merchandiseRepository.listProducts();
  // The built-in title and description (dashboard → Pages shows them greyed); the page's SEO fields override them.
  const seo = getPageDefinition("merchandise").seo;
  return buildPageMetadata({
    title: seo?.title ?? "Merchandise",
    description: seo?.description ?? "",
    path: routes.merchandise(),
    page: "merchandise",
    // An empty shop is a thin page: kept out of search results until the first product is published.
    noindex: products.length === 0,
  });
}

export default function MerchandisePage() {
  return <MerchandiseIndexPageView />;
}
