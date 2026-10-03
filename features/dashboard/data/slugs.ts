import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { slugify } from "@/lib/utils/slug";

type SlugTable = "films" | "services" | "prints" | "posts" | "products" | "product_categories";
type Db = SupabaseClient<Database>;

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** `base` made URL-safe and unique in `table` (appending -2, -3…); `keep` is the row's own current slug. */
export async function uniqueSlug(db: Db, table: SlugTable, base: string, keep?: string): Promise<string> {
  const root = slugify(base).slice(0, 100) || "item";
  for (let n = 1; n < 50; n++) {
    const candidate = n === 1 ? root : `${root}-${n}`;
    if (candidate === keep) return candidate;
    const { count } = await db.from(table).select("slug", { count: "exact", head: true }).eq("slug", candidate);
    if (!count) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

/**
 * A page moved from `from` to `to` (a renamed slug, or a deleted item sent to its index):
 * add a permanent redirect, point older redirects at the new address, and drop any redirect
 * that would now shadow a live page at `to`.
 */
export async function recordMove(db: Db, from: string, to: string, note: string) {
  if (from === to) return;
  await db.from("redirects").delete().eq("source", to);
  await db.from("redirects").update({ destination: to }).eq("destination", from);
  await db.from("redirects").upsert({ source: from, destination: to, permanent: true, note }, { onConflict: "source" });
}
