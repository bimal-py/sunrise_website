import type { ImageAsset } from "@/shared/domain/image";

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock" | "made_to_order" | "preorder";

/** A product photo: pre-built sizes plus its description. The first one is the main photo. */
export type ProductImage = ImageAsset & { alt: string };

/** One option group, e.g. { name: "Size", values: ["8×10 in", "12×18 in"] }. */
export type ProductOption = { name: string; values: string[] };

/** One combination of option values, with its own price, stock and photo when they differ. */
export type ProductVariant = {
  id: string;
  options: Record<string, string>;
  /** Null = the product's price. */
  price: number | null;
  compareAtPrice: number | null;
  sku: string;
  stockStatus: StockStatus;
  /** Index into the product's photos, shown when this variant is chosen. */
  imageIndex: number | null;
};

export type ProductCategory = {
  id: string;
  slug: string;
  name: string;
  nameNe: string;
  description: string;
  image: ImageAsset | null;
};

/** Something the studio sells (merchandise). Orders are sent as messages; there's no checkout. */
export type Product = {
  id: string;
  slug: string;
  name: string;
  nameNe: string;
  category: ProductCategory | null;
  summary: string;
  /** Markdown. */
  description: string;
  highlights: string[];
  images: ProductImage[];
  price: number;
  compareAtPrice: number | null;
  currency: string;
  sku: string;
  stockStatus: StockStatus;
  options: ProductOption[];
  variants: ProductVariant[];
  specifications: { label: string; value: string }[];
  deliveryInfo: string;
  warrantyInfo: string;
  minOrderQuantity: number;
  maxOrderQuantity: number | null;
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
  ogImage: ImageAsset | null;
  updatedAt: string | null;
};

export const stockLabels: Record<StockStatus, string> = {
  in_stock: "In stock",
  low_stock: "Only a few left",
  out_of_stock: "Out of stock",
  made_to_order: "Made to order",
  preorder: "Pre-order",
};

/** Can it be ordered right now? */
export function isOrderable(status: StockStatus): boolean {
  return status !== "out_of_stock";
}

/** "Rs. 1,299" (Nepali rupees) or "USD 12.50" for other currencies. */
export function formatPrice(amount: number, currency = "NPR"): string {
  const whole = Number.isInteger(amount);
  const number = new Intl.NumberFormat("en-IN", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 }).format(amount);
  return currency === "NPR" ? `Rs. ${number}` : `${currency} ${number}`;
}

/** Whole percent off, when the usual price is higher than the price. */
export function discountPercent(price: number, compareAtPrice: number | null): number | null {
  if (!compareAtPrice || compareAtPrice <= price || compareAtPrice <= 0) return null;
  const percent = Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
  return percent > 0 ? percent : null;
}

/** "Size: 8×10 in · Frame: Walnut". */
export function variantLabel(variant: Pick<ProductVariant, "options">): string {
  return Object.entries(variant.options)
    .map(([name, value]) => `${name}: ${value}`)
    .join(" · ");
}

/** The price, usual price and stock a buyer sees for a product or one of its variants. */
export function offerFor(product: Pick<Product, "price" | "compareAtPrice" | "stockStatus" | "sku">, variant?: ProductVariant | null) {
  const price = variant?.price ?? product.price;
  const compareAtPrice = variant ? (variant.compareAtPrice ?? (variant.price === null ? product.compareAtPrice : null)) : product.compareAtPrice;
  return {
    price,
    compareAtPrice,
    discount: discountPercent(price, compareAtPrice),
    stockStatus: variant?.stockStatus ?? product.stockStatus,
    sku: variant?.sku || product.sku,
  };
}

/** Lowest and highest price across the variants (for cards and structured data). */
export function priceRange(product: Pick<Product, "price" | "variants">): { min: number; max: number } {
  const prices = product.variants.length ? product.variants.map((v) => v.price ?? product.price) : [product.price];
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
