import type { Metadata } from "next";
import { siteConfig } from "@/lib/config/site";

/** 1200×630 share image for pages without their own (built by scripts/optimize-images.py). */
export const defaultOgImage = "/brand/og-default.jpg";

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  noindex?: boolean;
};

/** Metadata for an ordinary page: canonical, Open Graph and Twitter in one place. */
export function buildPageMetadata({ title, description, path, image, noindex }: PageMetadataInput): Metadata {
  // Share images are 1200×630 (the size Facebook, WhatsApp, X and LinkedIn expect).
  const ogImage = { url: image ?? defaultOgImage, width: 1200, height: 630 };
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: {
      title,
      description,
      type: "website",
      url: absoluteUrl(path),
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      images: [ogImage],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage.url] },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

type ArticleMetadataInput = PageMetadataInput & {
  publishedTime: string;
  modifiedTime?: string | null;
  authors: string[];
  keywords?: string[];
};

export function buildArticleMetadata(input: ArticleMetadataInput): Metadata {
  const base = buildPageMetadata(input);
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
