import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { compileMDX } from "next-mdx-remote/rsc";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { siteConfig } from "@/lib/config/site";
import type { BlogCoverImage, BlogPost, BlogPostPreview } from "@/features/blog/domain/entities";
import type { BlogRepository } from "@/features/blog/domain/repositories";
import { mdxComponents } from "@/features/blog/presentation/components/mdx-components";
import { extractHeadings, readingTime, tagSlug } from "./blog.utils";
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
    author: frontmatter.author ?? siteConfig.name,
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

const listAll = cache(async (): Promise<BlogPostPreview[]> => {
  const files = await readdir(POSTS_DIR).catch(() => [] as string[]);
  const posts = await Promise.all(
    files.filter((file) => file.endsWith(".mdx")).map((file) => compileCached(file.replace(/\.mdx$/, ""))),
  );
  return posts
    .filter((post) => post !== null)
    .map((post) => post.preview)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || Number(b.featured) - Number(a.featured));
});

/** Every word of the query (case-insensitive) appears in the post's title, summary or tags. */
function matches(post: BlogPostPreview, q: string): boolean {
  const haystack = [post.title, post.summary, ...post.tags].join(" ").toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

export const blogRepository: BlogRepository = {
  async listPosts({ tag, q, limit } = {}) {
    let posts = await listAll();
    if (tag) posts = posts.filter((post) => post.tags.some((t) => tagSlug(t) === tag));
    if (q?.trim()) posts = posts.filter((post) => matches(post, q));
    return limit ? posts.slice(0, limit) : posts;
  },

  async listRelated(slug, limit) {
    const posts = await listAll();
    const tags = new Set(posts.find((post) => post.slug === slug)?.tags);
    const shared = (post: BlogPostPreview) => post.tags.filter((tag) => tags.has(tag)).length;
    // listAll is newest first and sort is stable, so ties stay newest first.
    return posts
      .filter((post) => post.slug !== slug)
      .sort((a, b) => shared(b) - shared(a))
      .slice(0, limit);
  },

  async getPost(slug): Promise<BlogPost | null> {
    if (!/^[a-z0-9-]+$/.test(slug)) return null; // never touch the filesystem with odd input
    const post = await compileCached(slug);
    return post ? { ...post.preview, headings: post.headings, content: post.content } : null;
  },

  async listTags() {
    const counts = new Map<string, number>();
    for (const post of await listAll()) {
      for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count);
  },
};
