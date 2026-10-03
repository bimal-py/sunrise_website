import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { TAG } from "@/lib/cache/tags";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { readClient } from "@/lib/supabase/read-client";
import type { Json, PageKey } from "@/lib/supabase/types";
import type { ImageAsset } from "@/shared/domain/image";

/** A fixed page's editable copy and SEO fields (dashboard → Pages). Empty = the default in code. */
export type PageData = {
  key: PageKey;
  content: Record<string, Json>;
  body: string;
  seoTitle: string;
  seoDescription: string;
  ogImage: ImageAsset | null;
  updatedAt: string | null;
};

const empty = (key: PageKey): PageData => ({ key, content: {}, body: "", seoTitle: "", seoDescription: "", ogImage: null, updatedAt: null });

// Every page's row in one entry, cached until a save calls updateTag(TAG.pages).
const loadPages = unstable_cache(
  async (): Promise<PageData[]> => {
    const { data, error } = await readClient().from("pages").select("*");
    if (error) throw new Error(`pages: ${error.message}`);
    return data.map((row) => ({
      key: row.key,
      content: row.content ?? {},
      body: row.body,
      seoTitle: row.seo_title,
      seoDescription: row.seo_description,
      ogImage: row.og_image,
      updatedAt: row.updated_at,
    }));
  },
  ["pages"],
  { tags: [TAG.pages] },
);

export const getPage = cache(async (key: PageKey): Promise<PageData> => {
  if (!isSupabaseConfigured) return empty(key);
  return (await loadPages()).find((page) => page.key === key) ?? empty(key);
});
