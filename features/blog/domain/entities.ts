import type { ReactElement } from "react";

/** Posts are English by default; Nepali posts set `language: ne` in frontmatter. */
export type BlogLanguage = "en" | "ne";

/**
 * A post's cover photo. Real photography only (the studio's own work, or
 * licensed photos), credited under the image on the article page.
 */
export type BlogCoverImage = {
  /** Logical path "/images/blog/<name>.webp"; lib/image-loader.ts serves the right pre-built size. */
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Tiny inline preview shown while the photo loads. */
  blurDataURL: string;
  /** 1200×630 JPEG for link previews (Open Graph / structured data). */
  ogImage: string;
  credit: string;
  creditUrl: string;
  /** Empty for the studio's own photos. */
  license: string;
  licenseUrl: string;
};

export type BlogPostPreview = {
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  updatedAt: string | null;
  author: string;
  tags: string[];
  language: BlogLanguage;
  coverImage: BlogCoverImage | null;
  readingTimeMinutes: number;
  featured: boolean;
  /** Dashboard SEO overrides; empty = the title and summary. */
  seoTitle?: string;
  seoDescription?: string;
};

export type BlogHeading = { id: string; text: string; depth: 2 | 3 };

export type BlogPost = BlogPostPreview & {
  headings: BlogHeading[];
  /** Rendered MDX body. */
  content: ReactElement;
};
