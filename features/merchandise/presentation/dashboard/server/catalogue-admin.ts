import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ProductCategoryRow, ProductRow } from "@/lib/supabase/types";
import { slugify } from "@/lib/utils/slug";

/**
 * Reads and small writes for the merchandise screens of the dashboard, as the signed-in
 * admin (row level security lets admins see drafts). Callers check the admin first.
 */

type Db = SupabaseClient<Database>;
type Table = "products" | "product_categories";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Plenty for a studio's shop; the list pages filter and page these in memory. */
const LIST_CAP = 1000;

/** The products list's columns (everything but the long texts). */
const PRODUCT_LIST_COLUMNS =
  "id, slug, name, name_ne, category_id, summary, images, price, compare_at_price, currency, sku, stock_status, options, variants, featured, published, sort_order, created_at, updated_at";

export type ProductListRow = Pick<
  ProductRow,
  | "id"
  | "slug"
  | "name"
  | "name_ne"
  | "category_id"
  | "summary"
  | "images"
  | "price"
  | "compare_at_price"
  | "currency"
  | "sku"
  | "stock_status"
  | "options"
  | "variants"
  | "featured"
  | "published"
  | "sort_order"
  | "created_at"
  | "updated_at"
>;

/**
 * The orders the shop uses (features/merchandise/data/merchandise.repository.ts): products by
 * sort order then newest first, categories by sort order then oldest first. The dashboard
 * lists them the same way, so "move up" means up in the shop too.
 */
const ORDER: Record<Table, { newestFirst: boolean }> = {
  products: { newestFirst: true },
  product_categories: { newestFirst: false },
};

export async function listDashboardProducts(db: Db): Promise<ProductListRow[]> {
  const { data, error } = await db
    .from("products")
    .select(PRODUCT_LIST_COLUMNS)
    .order("sort_order")
    .order("created_at", { ascending: false })
    .limit(LIST_CAP);
  if (error) throw new Error(`Couldn't load the products: ${error.message}`);
  return data as ProductListRow[];
}

export async function getDashboardProduct(db: Db, id: string): Promise<ProductRow | null> {
  if (!UUID.test(id)) return null;
  const { data, error } = await db.from("products").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Couldn't load the product: ${error.message}`);
  return data;
}

export async function listDashboardCategories(db: Db): Promise<ProductCategoryRow[]> {
  const { data, error } = await db.from("product_categories").select("*").order("sort_order").order("created_at").limit(LIST_CAP);
  if (error) throw new Error(`Couldn't load the categories: ${error.message}`);
  return data;
}

export async function getDashboardCategory(db: Db, id: string): Promise<ProductCategoryRow | null> {
  if (!UUID.test(id)) return null;
  const { data, error } = await db.from("product_categories").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Couldn't load the category: ${error.message}`);
  return data;
}

export type CategoryCount = { total: number; published: number };

/** How many products each category holds (all, and published), by category id. */
export async function productCountsByCategory(db: Db): Promise<Map<string, CategoryCount>> {
  const { data, error } = await db.from("products").select("category_id, published").not("category_id", "is", null).limit(LIST_CAP * 5);
  if (error) throw new Error(`Couldn't count the products: ${error.message}`);
  const counts = new Map<string, CategoryCount>();
  for (const row of data) {
    if (!row.category_id) continue;
    const count = counts.get(row.category_id) ?? { total: 0, published: 0 };
    count.total += 1;
    if (row.published) count.published += 1;
    counts.set(row.category_id, count);
  }
  return counts;
}

/** The next free place at the end of a list. */
export async function nextSortOrder(db: Db, table: Table): Promise<number> {
  const { data } = await db.from(table).select("sort_order").order("sort_order", { ascending: false }).limit(1);
  return (data?.[0]?.sort_order ?? 0) + 10;
}

/** `base` made URL-safe and unique in `table` (appending -2, -3…); `keep` is the row's own current slug. */
export async function uniqueSlugIn(db: Db, table: Table, base: string, keep?: string): Promise<string> {
  const root = slugify(base).slice(0, 100).replace(/-+$/, "") || (table === "products" ? "product" : "category");
  for (let n = 1; n < 50; n++) {
    const candidate = n === 1 ? root : `${root}-${n}`;
    if (candidate === keep) return candidate;
    const { count, error } = await db.from(table).select("slug", { count: "exact", head: true }).eq("slug", candidate);
    if (error) throw new Error(error.message);
    if (!count) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

/**
 * Move a product or category one place up or down, renumbering the list 10, 20, 30… Only
 * rows whose number changes are written (usually two once the list is numbered). Returns
 * false when there was nothing to move (already first/last, or gone).
 */
export async function moveWithin(db: Db, table: Table, id: string, direction: "up" | "down"): Promise<boolean> {
  const { data, error } = await db
    .from(table)
    .select("id, sort_order")
    .order("sort_order")
    .order("created_at", { ascending: !ORDER[table].newestFirst })
    .limit(LIST_CAP);
  if (error) throw new Error(`Couldn't read the order: ${error.message}`);
  const rows = [...data];
  const index = rows.findIndex((row) => row.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= rows.length) return false;
  [rows[index], rows[target]] = [rows[target], rows[index]];
  const changes = rows.flatMap((row, position) => ((position + 1) * 10 === row.sort_order ? [] : [{ id: row.id, sort_order: (position + 1) * 10 }]));
  // A few at a time: the first move on an unnumbered list rewrites every row.
  for (let start = 0; start < changes.length; start += 8) {
    const results = await Promise.all(changes.slice(start, start + 8).map((change) => db.from(table).update({ sort_order: change.sort_order }).eq("id", change.id)));
    const failed = results.find((result) => result.error);
    if (failed?.error) throw new Error(`Couldn't save the new order: ${failed.error.message}`);
  }
  return true;
}

/**
 * A saved redirect from `path` would hide a live page there (an old product's address, now
 * taken again): remove it. Returns whether one was removed (then refresh the redirects tag).
 */
export async function clearRedirectAt(db: Db, path: string): Promise<boolean> {
  const { count, error } = await db.from("redirects").delete({ count: "exact" }).eq("source", path);
  if (error) console.error("[merchandise] couldn't clear a redirect", error.message);
  return Boolean(count);
}
