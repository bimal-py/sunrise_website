import type { Metadata } from "next";
import { siteUrl } from "@/lib/config/site";
import type { PageKey } from "@/lib/supabase/types";
import { getPage } from "@/features/site/data/pages.repository";
import { getSiteSettings } from "@/features/site/data/settings.repository";

/** 1200×630 share image for pages without their own (built by scripts/optimize-images.py). */
export const defaultOgImage = "/brand/og-default.jpg";

export function absoluteUrl(path = "/") {
  return new URL(path, siteUrl).toString();
}

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  noindex?: boolean;
  /** A fixed page whose SEO fields (dashboard → Pages) override the title, description and image. */
  page?: PageKey;
};

/** Metadata for an ordinary page: canonical, Open Graph and Twitter in one place. */
export async function buildPageMetadata({ title, description, path, image, noindex, page }: PageMetadataInput): Promise<Metadata> {
  const [site, override] = await Promise.all([getSiteSettings(), page ? getPage(page) : null]);
  const finalTitle = override?.seoTitle || title;
  const finalDescription = override?.seoDescription || description;
  // Share images are 1200×630 (the size Facebook, WhatsApp, X and LinkedIn expect).
  const ogImage = { url: override?.ogImage?.ogImage ?? image ?? site.seo.ogImage?.ogImage ?? defaultOgImage, width: 1200, height: 630 };
  return {
    title: finalTitle,
    description: finalDescription,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: {
      title: finalTitle,
      description: finalDescription,
      type: "website",
      url: absoluteUrl(path),
      siteName: site.name,
      locale: site.locale,
      images: [ogImage],
    },
    twitter: { card: "summary_large_image", title: finalTitle, description: finalDescription, images: [ogImage.url] },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

type ArticleMetadataInput = PageMetadataInput & {
  publishedTime: string;
  modifiedTime?: string | null;
  authors: string[];
  keywords?: string[];
};

export async function buildArticleMetadata(input: ArticleMetadataInput): Promise<Metadata> {
  const base = await buildPageMetadata(input);
  return {
    ...base,
    keywords: input.keywords,
    authors: input.authors.map((name) => ({ name })),
    openGraph: {
      ...base.openGraph,
      type: "article",
      publishedTime: input.publishedTime,
      modifiedTime: input.modifiedTime ?? input.publishedTime,
      authors: input.authors,
    },
  };
}
