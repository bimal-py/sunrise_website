import type { StockStatus } from "@/features/merchandise/domain/entities";
import { priceRange, stockLabels } from "@/features/merchandise/domain/entities";
import type { StatusTone } from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { isStockStatus, merchandisePaths, STOCK_TONES } from "./catalogue-options";
import type { ProductListRow } from "./server/catalogue-admin";

/**
 * The products list's filters, read from the address and applied in memory (a studio's shop
 * is small): status, category, stock, sort, search words and the page.
 */

export const PRODUCTS_PAGE_SIZE = 20;

export const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "featured", label: "Featured" },
] as const;

export const SORTS = [
  { value: "order", label: "Shop order" },
  { value: "updated", label: "Recently updated" },
  { value: "name", label: "Name (A–Z)" },
  { value: "price-asc", label: "Price (low to high)" },
  { value: "price-desc", label: "Price (high to low)" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];
type SortValue = (typeof SORTS)[number]["value"];

export type ProductFilters = {
  status: StatusFilter;
  /** "all", "none" (no category) or a category's slug. */
  category: string;
  stock: "all" | StockStatus;
  sort: SortValue;
  q: string;
  page: number;
};

type Params = Record<string, string | string[] | undefined>;

const first = (params: Params, key: string) => {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
};

export function readProductFilters(params: Params, categorySlugs: string[]): ProductFilters {
  const status = first(params, "status");
  const category = first(params, "category");
  const stock = first(params, "stock");
  const sort = first(params, "sort");
  return {
    status: STATUS_FILTERS.some((option) => option.value === status) ? (status as StatusFilter) : "all",
    category: category === "none" || categorySlugs.includes(category) ? category : "all",
    stock: isStockStatus(stock) ? stock : "all",
    sort: SORTS.some((option) => option.value === sort) ? (sort as SortValue) : "order",
    q: first(params, "q").slice(0, 80),
    page: Math.max(1, Number.parseInt(first(params, "page"), 10) || 1),
  };
}

/** True when the list shows every product in the shop's order (only then can rows be moved up and down). */
export function isShopOrder(filters: ProductFilters): boolean {
  return filters.status === "all" && filters.category === "all" && filters.stock === "all" && filters.sort === "order" && !filters.q;
}

/** The list's address for these filters (defaults left out), e.g. for the pager. */
export function productsHref(filters: ProductFilters, page = filters.page): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.category !== "all") params.set("category", filters.category);
  if (filters.stock !== "all") params.set("stock", filters.stock);
  if (filters.sort !== "order") params.set("sort", filters.sort);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${merchandisePaths.products()}?${query}` : merchandisePaths.products();
}

const amount = (value: number | string | null) => (value === null ? null : Number(value));

/** Lowest and highest price, variants included. */
export function rowPriceRange(row: ProductListRow): { min: number; max: number } {
  return priceRange({ price: Number(row.price), variants: row.variants.map((variant) => ({ ...variant, price: amount(variant.price) })) });
}

/** The stock statuses a product has (its own, or its variants'). */
export function rowStockStatuses(row: ProductListRow): StockStatus[] {
  return row.variants.length ? [...new Set(row.variants.map((variant) => variant.stockStatus))] : [row.stock_status];
}

/** The stock badge for a product: its status, or a summary of its variants'. */
export function stockBadge(row: ProductListRow): { label: string; tone: StatusTone } {
  if (row.variants.length === 0) return { label: stockLabels[row.stock_status], tone: STOCK_TONES[row.stock_status] };
  const out = row.variants.filter((variant) => variant.stockStatus === "out_of_stock").length;
  const statuses = rowStockStatuses(row);
  if (statuses.length === 1) return { label: stockLabels[statuses[0]], tone: STOCK_TONES[statuses[0]] };
  if (out > 0) return { label: `${out} of ${row.variants.length} out of stock`, tone: "gold" };
  return { label: "Stock varies", tone: "neutral" };
}

function matchesWords(row: ProductListRow, words: string[]): boolean {
  if (words.length === 0) return true;
  const haystack = [row.name, row.name_ne, row.slug, row.sku, row.summary, ...row.variants.map((variant) => variant.sku)].join(" ").toLowerCase();
  return words.every((word) => haystack.includes(word));
}

/** The rows this filter shows, in its order. `categoryIdBySlug` maps the category filter to ids. */
export function filterProducts(rows: ProductListRow[], filters: ProductFilters, categoryIdBySlug: Map<string, string>): ProductListRow[] {
  const words = filters.q.toLowerCase().split(/\s+/).filter(Boolean);
  const categoryId = filters.category === "all" || filters.category === "none" ? null : (categoryIdBySlug.get(filters.category) ?? null);
  const shown = rows.filter((row) => {
    if (filters.status === "published" && !row.published) return false;
    if (filters.status === "draft" && row.published) return false;
    if (filters.status === "featured" && !row.featured) return false;
    if (filters.category === "none" && row.category_id) return false;
    if (categoryId && row.category_id !== categoryId) return false;
    if (filters.stock !== "all" && !rowStockStatuses(row).includes(filters.stock)) return false;
    return matchesWords(row, words);
  });
  switch (filters.sort) {
    case "updated":
      return shown.toSorted((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
    case "name":
      return shown.toSorted((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
    case "price-asc":
      return shown.toSorted((a, b) => rowPriceRange(a).min - rowPriceRange(b).min);
    case "price-desc":
      return shown.toSorted((a, b) => rowPriceRange(b).max - rowPriceRange(a).max);
    default:
      return shown; // already in the shop's order
  }
}
