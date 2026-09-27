import GithubSlugger from "github-slugger";
import type { BlogHeading } from "@/features/blog/domain/entities";

const WORDS_PER_MINUTE = 220;

export function readingTime(source: string): number {
  const words = source.replace(/^---[\s\S]*?---/, "").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/**
 * `##` / `###` headings for the "On this page" list. Ids come from the same
 * slugger rehype-slug uses, so the anchors match the rendered headings.
 */
export function extractHeadings(source: string): BlogHeading[] {
  const slugger = new GithubSlugger();
  const body = source.replace(/^---[\s\S]*?---/, "").replace(/```[\s\S]*?```/g, "");
  return [...body.matchAll(/^(#{2,3})\s+(.+)$/gm)].map(([, hashes, raw]) => {
    const text = raw.replace(/[*_`]/g, "").trim();
    return { id: slugger.slug(text), text, depth: hashes.length as 2 | 3 };
  });
}

export function tagSlug(tag: string): string {
  return tag.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
