import type { Metadata } from "next";
import { merchandiseRepository } from "@/features/merchandise/data/merchandise.repository";
import { ProductDetailPageView } from "@/features/merchandise/presentation/views/product-detail-page-view";
import { getSiteSettings } from "@/features/site/data/settings.repository";
import { routes } from "@/lib/routes";
import { buildPageMetadata } from "@/lib/seo/metadata";

type PageProps = { params: Promise<{ slug: string }> };

// No dynamicParams = false: a product published in the dashboard after the last deploy renders on its first
// visit (then stays static until a save refreshes it); unknown slugs 404 or follow a saved redirect.

export async function generateStaticParams() {
  const products = await merchandiseRepository.listProducts();
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await merchandiseRepository.getProduct(slug);
  if (!product) return { title: "Product not found" };
  const site = await getSiteSettings();
  return buildPageMetadata({
    title: product.seoTitle || product.name,
    description: product.seoDescription || product.summary || `Order ${product.name} from ${site.name}.`,
    path: routes.product(product.slug),
    image: product.ogImage?.ogImage ?? product.images[0]?.ogImage,
  });
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  return <ProductDetailPageView slug={slug} />;
}
