import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { compileMDX } from "next-mdx-remote/rsc";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { TAG } from "@/lib/cache/tags";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { readClient } from "@/lib/supabase/read-client";
import type { PostRow } from "@/lib/supabase/types";
import type { BlogHeading, BlogPost, BlogPostPreview } from "@/features/blog/domain/entities";
import type { BlogRepository } from "@/features/blog/domain/repositories";
import { mdxComponents } from "@/features/blog/presentation/components/mdx-components";
import { getSiteSettings } from "@/features/site/data/settings.repository";
import { getStaticPost, listStaticPosts } from "./blog.static";
import { tagSlug } from "./blog.utils";

const PREVIEW_COLUMNS =
  "slug, title, summary, published_at, updated_on, author, tags, language, featured, cover, cover_alt, cover_credit, cover_credit_url, cover_license, cover_license_url, reading_minutes, seo_title, seo_description";

type PreviewRow = Pick<
  PostRow,
  | "slug" | "title" | "summary" | "published_at" | "updated_on" | "author" | "tags" | "language" | "featured" | "cover"
  | "cover_alt" | "cover_credit" | "cover_credit_url" | "cover_license" | "cover_license_url" | "reading_minutes"
  | "seo_title" | "seo_description"
>;

export function rowToPreview(row: PreviewRow, studioName: string): BlogPostPreview {
  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    publishedAt: row.published_at ?? "",
    updatedAt: row.updated_on,
    author: row.author || studioName,
    tags: row.tags,
    language: row.language,
    coverImage: row.cover
      ? {
          ...row.cover,
          alt: row.cover_alt,
          credit: row.cover_credit,
          creditUrl: row.cover_credit_url,
          license: row.cover_license,
          licenseUrl: row.cover_license_url,
        }
      : null,
    readingTimeMinutes: row.reading_minutes,
    featured: row.featured,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
  };
}

// Every published post without its body, one entry tagged "posts", no timer.
const loadPreviews = unstable_cache(
  async (): Promise<PreviewRow[]> => {
    const { data, error } = await readClient()
      .from("posts")
      .select(PREVIEW_COLUMNS)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(`posts: ${error.message}`);
    return data;
  },
  ["posts:previews"],
  { tags: [TAG.posts] },
);

// A post's body; only ever called for slugs that exist (checked against the previews).
const loadBody = unstable_cache(
  async (slug: string): Promise<{ body: string; headings: BlogHeading[] } | null> => {
    const { data, error } = await readClient().from("posts").select("body, headings").eq("slug", slug).eq("status", "published").maybeSingle();
    if (error) throw new Error(`posts/${slug}: ${error.message}`);
    return data;
  },
  ["posts:body"],
  { tags: [TAG.posts] },
);

const listAll = cache(async (): Promise<BlogPostPreview[]> => {
  if (!isSupabaseConfigured) return listStaticPosts();
  const [rows, site] = await Promise.all([loadPreviews(), getSiteSettings()]);
  return rows.map((row) => rowToPreview(row, site.name));
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
    if (!/^[a-z0-9-]+$/.test(slug)) return null;
    if (!isSupabaseConfigured) return getStaticPost(slug);
    const preview = (await listAll()).find((post) => post.slug === slug);
    if (!preview) return null;
    const stored = await loadBody(slug);
    if (!stored) return null;
    const { content } = await compileMDX({
      source: stored.body,
      components: mdxComponents,
      options: { mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeSlug] } },
    });
    return { ...preview, headings: stored.headings, content };
  },

  async listTags() {
    const counts = new Map<string, number>();
    for (const post of await listAll()) {
      for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count);
  },
};
