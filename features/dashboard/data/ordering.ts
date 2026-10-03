import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Move a service or print one place up or down in the site's order. Usually two rows swap
 * their sort numbers (two quick updates); when numbers are shared or missing, the whole list
 * is renumbered 10, 20, 30… first so the move is exact.
 */
export async function moveRow(db: SupabaseClient<Database>, table: "services" | "prints", id: string, direction: "up" | "down") {
  const { data, error } = await db.from(table).select("id, sort_order").order("sort_order").order("created_at");
  if (error) throw new Error(`Couldn't read the order: ${error.message}`);
  const rows = data.map((row) => ({ id: row.id, sort: row.sort_order }));
  const index = rows.findIndex((row) => row.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= rows.length) return;

  const distinct = new Set(rows.map((row) => row.sort)).size === rows.length;
  if (distinct) {
    const [a, b] = [rows[index], rows[target]];
    const results = await Promise.all([
      db.from(table).update({ sort_order: b.sort }).eq("id", a.id),
      db.from(table).update({ sort_order: a.sort }).eq("id", b.id),
    ]);
    const failed = results.find((result) => result.error);
    if (failed?.error) throw new Error(`Couldn't save the new order: ${failed.error.message}`);
    return;
  }

  [rows[index], rows[target]] = [rows[target], rows[index]];
  const results = await Promise.all(rows.map((row, position) => db.from(table).update({ sort_order: (position + 1) * 10 }).eq("id", row.id)));
  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(`Couldn't save the new order: ${failed.error.message}`);
}
