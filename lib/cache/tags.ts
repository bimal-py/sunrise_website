/**
 * Cache tags for the public site's data. Pages are static: every read goes through
 * unstable_cache with one of these tags and NO time-based revalidation, so a page is
 * rebuilt only when a dashboard save calls updateTag(tag) (or /api/revalidate is hit).
 * Never pass `revalidate` to unstable_cache or export `revalidate` from a page: the
 * shortest timer on a page wins and turns into steady ISR writes on Vercel.
 */
export const TAG = {
  settings: "settings",
  pages: "pages",
  films: "films",
  services: "services",
  prints: "prints",
  posts: "posts",
  reviews: "reviews",
  /** Merchandise: products and their categories. */
  products: "products",
  redirects: "redirects",
} as const;

export type CacheTag = (typeof TAG)[keyof typeof TAG];

export const ALL_TAGS = Object.values(TAG) as CacheTag[];
