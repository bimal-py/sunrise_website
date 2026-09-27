import type { Review } from "./entities";

/** Reviews data boundary: a typed file today, Supabase later (pages don't change). */
export interface ReviewRepository {
  /** Newest first. In development, labelled samples stand in while there are no real reviews. */
  list(): Promise<Review[]>;
}
