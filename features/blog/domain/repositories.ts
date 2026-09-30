import type { BlogPost, BlogPostPreview } from "./entities";

/** Blog data boundary — MDX files today, swappable for a CMS/database later. */
export interface BlogRepository {
  /** Newest first. `tag` is a topic slug; `q` keeps posts whose title, summary or tags contain every word of it. */
  listPosts(options?: { tag?: string; q?: string; limit?: number }): Promise<BlogPostPreview[]>;
  getPost(slug: string): Promise<BlogPost | null>;
  /** Other posts to read next: most tags in common with `slug` first, then newest. */
  listRelated(slug: string, limit: number): Promise<BlogPostPreview[]>;
  listTags(): Promise<{ tag: string; count: number }[]>;
}
