import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { compileMDX } from "next-mdx-remote/rsc";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { defaultSiteSettings } from "@/lib/config/site";
import type { BlogCoverImage, BlogPost, BlogPostPreview } from "@/features/blog/domain/entities";
import { mdxComponents } from "@/features/blog/presentation/components/mdx-components";
import { extractHeadings, readingTime } from "./blog.utils";
import type { BlogFrontmatter } from "./dto";
import coverImages from "./generated/images.json";

const POSTS_DIR = path.join(process.cwd(), "content/blog");

/** Cover photo from frontmatter + the size/blur data scripts/optimize-images.py generated. */
function cover(frontmatter: BlogFrontmatter): BlogCoverImage | null {
  const name = frontmatter.cover?.match(/^\/images\/blog\/([a-z0-9-]+)\.webp$/)?.[1];
  if (!name) return null;
  const built = (coverImages as Record<string, { width: number; height: number; blurDataURL: string }>)[name];
  if (!built) throw new Error(`Cover "${name}" hasn't been built. Add it to assets/images/blog/ and run scripts/optimize-images.py.`);
  return {
    src: frontmatter.cover!,
    alt: frontmatter.coverAlt ?? "",
    width: built.width,
    height: built.height,
    blurDataURL: built.blurDataURL,
    ogImage: `/images/blog/og/${name}.jpg`,
    credit: frontmatter.coverCredit ?? "",
    creditUrl: frontmatter.coverCreditUrl ?? "",
    license: frontmatter.coverLicense ?? "",
    licenseUrl: frontmatter.coverLicenseUrl ?? "",
  };
}

async function compile(slug: string) {
  const source = await readFile(path.join(POSTS_DIR, `${slug}.mdx`), "utf8").catch(() => null);
  if (source === null) return null;

  const { frontmatter, content } = await compileMDX<BlogFrontmatter>({
    source,
    components: mdxComponents,
    options: {
      parseFrontmatter: true,
      mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeSlug] },
    },
  });
  if (frontmatter.draft) return null;

  const preview: BlogPostPreview = {
    slug,
    title: frontmatter.title,
    summary: frontmatter.summary,
    publishedAt: String(frontmatter.publishedAt),
    updatedAt: frontmatter.updatedAt ? String(frontmatter.updatedAt) : null,
    author: frontmatter.author ?? defaultSiteSettings.name,
    tags: frontmatter.tags ?? [],
    language: frontmatter.language ?? "en",
    coverImage: cover(frontmatter),

    readingTimeMinutes: readingTime(source),
    featured: frontmatter.featured ?? false,
  };
  return { preview, content, headings: extractHeadings(source) };
}

/** Per-request memo: the list and a detail page share one compile per post. */
const compileCached = cache(compile);

/** Offline fallback (no Supabase env): the MDX files in content/blog that seeded the database. */
export const listStaticPosts = cache(async (): Promise<BlogPostPreview[]> => {
  const files = await readdir(POSTS_DIR).catch(() => [] as string[]);
  const posts = await Promise.all(
    files.filter((file) => file.endsWith(".mdx")).map((file) => compileCached(file.replace(/\.mdx$/, ""))),
  );
  return posts
    .filter((post) => post !== null)
    .map((post) => post.preview)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || Number(b.featured) - Number(a.featured));
});

export async function getStaticPost(slug: string): Promise<BlogPost | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null; // never touch the filesystem with odd input
  const post = await compileCached(slug);
  return post ? { ...post.preview, headings: post.headings, content: post.content } : null;
}
