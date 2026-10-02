import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/** Move a service or print one place up or down, renumbering the list 10, 20, 30… */
export async function moveRow(db: SupabaseClient<Database>, table: "services" | "prints", id: string, direction: "up" | "down") {
  const { data, error } = await db.from(table).select("id").order("sort_order").order("created_at");
  if (error) throw new Error(error.message);
  const ids = data.map((row) => row.id);
  const index = ids.indexOf(id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= ids.length) return;
  [ids[index], ids[target]] = [ids[target], ids[index]];
  for (const [position, rowId] of ids.entries()) {
    await db.from(table).update({ sort_order: (position + 1) * 10 }).eq("id", rowId);
  }
}
