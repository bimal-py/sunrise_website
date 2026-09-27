/**
 * A client's review. Real words from real clients only (CLAUDE.md §7): copied
 * from the studio's Facebook recommendations, Google reviews, or given in
 * person with permission. Never written by us, never edited beyond trimming.
 */
export type Review = {
  /** As the client agreed to be named: "Sushma K." or "Kedar & Sushma". */
  name: string;
  /** What we shot: "Wedding", "Pasni", "Studio portraits". */
  occasion: string;
  /** Where, when known: "Panchamul". */
  place?: string;
  /** YYYY-MM when the review was given. */
  date?: string;
  /** 1–5. */
  rating: number;
  text: string;
  /** Where it was published, so anyone can check it. */
  source?: { label: "Facebook" | "Google" | "YouTube" | "In person"; url?: string };
  /** Dev-only placeholder (never shipped to production). */
  sample?: boolean;
};
