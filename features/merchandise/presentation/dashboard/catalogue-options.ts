import { routes } from "@/lib/routes";
import type { StockStatus } from "@/features/merchandise/domain/entities";
import type { StatusTone } from "@/features/dashboard/presentation/components/ui/dashboard-ui";

/**
 * What the merchandise screens of the dashboard share with their server checks: the choices
 * in the selects, the limits, the addresses. Safe in the browser (no server code).
 */

/** `label` for the product's own stock select, `short` where room is tight (a variant's row). */
export const STOCK_CHOICES: { value: StockStatus; label: string; short: string }[] = [
  { value: "in_stock", label: "In stock", short: "In stock" },
  { value: "low_stock", label: "Low stock (only a few left)", short: "Low stock" },
  { value: "out_of_stock", label: "Out of stock", short: "Out of stock" },
  { value: "made_to_order", label: "Made to order", short: "Made to order" },
  { value: "preorder", label: "Pre-order", short: "Pre-order" },
];

const STOCK_VALUES = new Set<string>(STOCK_CHOICES.map((choice) => choice.value));

export function isStockStatus(value: unknown): value is StockStatus {
  return typeof value === "string" && STOCK_VALUES.has(value);
}

/** Badge colours for stock: green to order, gold to watch, red when it can't be ordered. */
export const STOCK_TONES: Record<StockStatus, StatusTone> = {
  in_stock: "green",
  low_stock: "gold",
  out_of_stock: "red",
  made_to_order: "neutral",
  preorder: "neutral",
};

export const CURRENCIES: { code: string; label: string }[] = [
  { code: "NPR", label: "NPR · Nepali rupee" },
  { code: "INR", label: "INR · Indian rupee" },
  { code: "USD", label: "USD · US dollar" },
  { code: "EUR", label: "EUR · Euro" },
  { code: "GBP", label: "GBP · British pound" },
  { code: "AUD", label: "AUD · Australian dollar" },
];

export const PRODUCT_LIMITS = {
  photos: 12,
  highlights: 10,
  optionGroups: 3,
  optionValues: 20,
  variants: 100,
  specifications: 30,
  /** messages.quantity allows 1–1000, so an order can never ask for more. */
  quantity: 1000,
} as const;

/** Option names and values, tidied the same way in the editor and on the server (so they match). */
export function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

export const OPTION_NAME_MAX = 40;
export const OPTION_VALUE_MAX = 60;

/**
 * A variant as the editor sends it: prices as typed (checked on the server) and its photo by
 * address (the server turns it into an index into the checked gallery).
 */
export type VariantInput = {
  id: string;
  options: Record<string, string>;
  price: string;
  compareAtPrice: string;
  sku: string;
  stockStatus: StockStatus;
  imageSrc: string;
};

/** The dashboard's merchandise addresses (lib/routes builds them). */
export const merchandisePaths = {
  products: () => routes.dashboardSection("merchandise"),
  newProduct: () => routes.dashboardNew("merchandise"),
  product: (id: string) => routes.dashboardItem("merchandise", id),
  categories: () => routes.dashboardSection("merchandise/categories"),
  newCategory: () => routes.dashboardNew("merchandise/categories"),
  category: (id: string) => routes.dashboardItem("merchandise/categories", id),
};
