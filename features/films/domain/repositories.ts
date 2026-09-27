import type { Film, FilmCategory } from "./entities";

/** Films data boundary: YouTube feed snapshot + curation today, Supabase later. */
export interface FilmRepository {
  /** Newest first. */
  list(options?: { category?: FilmCategory; limit?: number }): Promise<Film[]>;
  /** Featured films first (curation.json `featured`), then the newest. */
  listHighlights(limit: number): Promise<Film[]>;
  get(slug: string): Promise<Film | null>;
  /** Other films of the same category, then any, excluding this one. */
  listRelated(film: Film, limit: number): Promise<Film[]>;
}
