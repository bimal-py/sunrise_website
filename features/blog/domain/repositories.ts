import type { BlogPost, BlogPostPreview } from "./entities";

/** Blog data boundary — MDX files today, swappable for a CMS/database later. */
export interface BlogRepository {
  listPosts(options?: { tag?: string; limit?: number }): Promise<BlogPostPreview[]>;
  getPost(slug: string): Promise<BlogPost | null>;
  listTags(): Promise<{ tag: string; count: number }[]>;
}
