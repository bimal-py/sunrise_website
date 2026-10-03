import { routes } from "@/lib/routes";

/**
 * The dashboard's films list filters (View, Sort by, Order, search, page), read from the
 * address and written back to it. Shared by the list page, its links, and the actions that
 * return to the same filtered page after a save or a delete (`back`).
 */

export const FILM_VIEWS = [
  { value: "all", label: "All" },
  { value: "visible", label: "On the site" },
  { value: "uncurated", label: "Needs curating" },
  { value: "featured", label: "Featured" },
  { value: "hidden", label: "Hidden" },
] as const;

export const FILM_SORTS = [
  { value: "published_at", label: "Published date" },
  { value: "updated_at", label: "Updated date" },
  { value: "title", label: "Title" },
] as const;

export const FILM_ORDERS = [
  { value: "desc", label: "Descending" },
  { value: "asc", label: "Ascending" },
] as const;

export type FilmView = (typeof FILM_VIEWS)[number]["value"];
export type FilmSort = (typeof FILM_SORTS)[number]["value"];
export type FilmListQuery = { view: FilmView; sort: FilmSort; order: "asc" | "desc"; q: string; page: number };

type Params = URLSearchParams | Record<string, string | string[] | undefined>;

function get(params: Params, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

/** Titles read A→Z by default; dates newest first. */
export const defaultFilmOrder = (sort: FilmSort): "asc" | "desc" => (sort === "title" ? "asc" : "desc");

export function parseFilmListQuery(params: Params): FilmListQuery {
  const view = FILM_VIEWS.find((option) => option.value === get(params, "view"))?.value ?? "all";
  const sort = FILM_SORTS.find((option) => option.value === get(params, "sort"))?.value ?? "published_at";
  const order = get(params, "order");
  const page = Number.parseInt(get(params, "page") ?? "", 10);
  return {
    view,
    sort,
    order: order === "asc" || order === "desc" ? order : defaultFilmOrder(sort),
    q: (get(params, "q") ?? "").trim().slice(0, 100),
    page: Number.isFinite(page) ? Math.min(10_000, Math.max(1, page)) : 1,
  };
}

/** "view=uncurated&page=2" (defaults left out) plus `extra` (e.g. saved=…), without the "?". */
export function filmListParams(query: Partial<FilmListQuery>, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams();
  const sort = query.sort ?? "published_at";
  if (query.view && query.view !== "all") params.set("view", query.view);
  if (sort !== "published_at") params.set("sort", sort);
  if (query.order && query.order !== defaultFilmOrder(sort)) params.set("order", query.order);
  if (query.q) params.set("q", query.q);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  for (const [key, value] of Object.entries(extra)) if (value) params.set(key, value);
  return params.toString();
}

/** The films list's address for `query` (+ `extra` params). */
export function filmListHref(query: Partial<FilmListQuery>, extra: Record<string, string> = {}): string {
  const search = filmListParams(query, extra);
  const list = routes.dashboardSection("films");
  return search ? `${list}?${search}` : list;
}
