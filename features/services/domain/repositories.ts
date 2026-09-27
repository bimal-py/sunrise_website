import type { Service } from "./entities";

/** Services data boundary: a typed seed file today, Supabase later (pages don't change). */
export interface ServiceRepository {
  list(options?: { featured?: boolean }): Promise<Service[]>;
  get(slug: string): Promise<Service | null>;
  /** Services that list this print among their related prints. */
  listByPrint(printSlug: string): Promise<Service[]>;
}
