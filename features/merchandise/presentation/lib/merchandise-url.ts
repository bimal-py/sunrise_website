import { routes } from "@/lib/routes";

/** The shop filtered by category and/or search words (either may be empty), like routes.blogFind. */
export function merchandiseFind({ category, q }: { category?: string; q?: string }): string {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (q?.trim()) params.set("q", q.trim());
  const query = params.toString();
  return query ? `${routes.merchandise()}?${query}` : routes.merchandise();
}
