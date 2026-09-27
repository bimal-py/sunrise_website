import type { Print } from "./entities";

/** Prints data boundary: a typed seed file today, Supabase later (pages don't change). */
export interface PrintRepository {
  list(options?: { featured?: boolean }): Promise<Print[]>;
  get(slug: string): Promise<Print | null>;
  listBySlugs(slugs: string[]): Promise<Print[]>;
}
