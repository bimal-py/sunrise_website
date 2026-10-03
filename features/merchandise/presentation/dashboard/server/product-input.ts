import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkSafeMdx } from "@/lib/mdx/compile";
import type { Database, ProductOptionValue, ProductRow, ProductVariantValue } from "@/lib/supabase/types";
import { bool, int, lines, str } from "@/features/dashboard/data/form";
import { galleryFromForm, imageFromForm, type GalleryImage } from "@/features/dashboard/data/image-input";
import { SLUG_PATTERN } from "@/features/dashboard/data/slugs";
import { variantLabel } from "@/features/merchandise/domain/entities";
import { cleanText, isStockStatus, OPTION_NAME_MAX, OPTION_VALUE_MAX, PRODUCT_LIMITS } from "../catalogue-options";
import { UUID } from "./catalogue-admin";

/**
 * Reading the product editor on the server. Nothing the browser sends is trusted: prices are
 * parsed here, photos are looked up in the media library, variants are checked against the
 * options, and the description is compiled once so a formatting slip can't break the page.
 */

type Db = SupabaseClient<Database>;

export type ProductValues = Omit<ProductRow, "id" | "slug" | "created_at" | "updated_at">;

const MONEY = /^\d{1,10}(\.\d{1,2})?$/;

/** "1,299", "1 299.50", "Rs. 1299" → 1299 / 1299.5; blank → null; anything else → not ok. */
export function parseMoney(input: unknown): { value: number | null; ok: boolean } {
  const text = String(input ?? "")
    .trim()
    .replace(/^(rs\.?|npr|रु\.?)\s*/i, "")
    .replace(/[,\s]/g, "");
  if (!text) return { value: null, ok: true };
  if (!MONEY.test(text)) return { value: null, ok: false };
  return { value: Math.round(Number(text) * 100) / 100, ok: true };
}

/** A whole number from the form: blank → null; not a whole number → NaN. */
function wholeNumber(formData: FormData, key: string): number | null {
  const text = str(formData, key, 20).replace(/[,\s]/g, "");
  if (!text) return null;
  return /^\d+$/.test(text) ? Number(text) : Number.NaN;
}

function jsonArray(value: FormDataEntryValue | null): unknown[] {
  try {
    const parsed: unknown = JSON.parse(String(value ?? "") || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const asRecord = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});

/** Up to three option groups, each with its choices. */
export function readOptions(formData: FormData): { options: ProductOptionValue[]; problems: string[] } {
  const problems: string[] = [];
  const options: ProductOptionValue[] = [];
  for (const item of jsonArray(formData.get("options")).slice(0, 20)) {
    const record = asRecord(item);
    const name = cleanText(record.name, OPTION_NAME_MAX);
    const values: string[] = [];
    for (const raw of Array.isArray(record.values) ? record.values.slice(0, 100) : []) {
      const value = cleanText(raw, OPTION_VALUE_MAX);
      if (value && !values.some((existing) => existing.toLowerCase() === value.toLowerCase())) values.push(value);
    }
    if (!name && values.length === 0) continue;
    if (!name) {
      problems.push("Give each option a name (for example Size or Colour).");
      continue;
    }
    if (values.length === 0) {
      problems.push(`Add at least one choice to the option “${name}”, or remove it.`);
      continue;
    }
    if (options.some((option) => option.name.toLowerCase() === name.toLowerCase())) {
      problems.push(`Two options are called “${name}”: give each its own name.`);
      continue;
    }
    if (values.length > PRODUCT_LIMITS.optionValues) problems.push(`“${name}” has more than ${PRODUCT_LIMITS.optionValues} choices.`);
    options.push({ name, values: values.slice(0, PRODUCT_LIMITS.optionValues) });
  }
  if (options.length > PRODUCT_LIMITS.optionGroups) problems.push(`A product can have up to ${PRODUCT_LIMITS.optionGroups} options (for example Size, Frame and Finish).`);
  return { options: options.slice(0, PRODUCT_LIMITS.optionGroups), problems };
}

/**
 * The variants, each one combination of the options' choices. A variant that doesn't match
 * the options (an option renamed or a choice removed since "Create variants") stops the save
 * with a clear message rather than being dropped quietly. Options without variants are fine:
 * the customer picks a choice, and the product's own price and stock apply to all of them.
 */
export function readVariants(
  formData: FormData,
  options: ProductOptionValue[],
  gallery: GalleryImage[],
  productPrice: number,
): { variants: ProductVariantValue[]; problems: string[] } {
  if (options.length === 0) return { variants: [], problems: [] };
  const items = jsonArray(formData.get("variants"));
  const problems: string[] = [];
  const priceProblems: string[] = [];
  const variants: ProductVariantValue[] = [];
  const combinations = new Set<string>();
  const ids = new Set<string>();
  let mismatched = 0;

  if (items.length > PRODUCT_LIMITS.variants) problems.push(`A product can have up to ${PRODUCT_LIMITS.variants} variants: remove some choices.`);
  for (const item of items.slice(0, PRODUCT_LIMITS.variants)) {
    const record = asRecord(item);
    const given = new Map(Object.entries(asRecord(record.options)).map(([key, value]) => [cleanText(key, OPTION_NAME_MAX), cleanText(value, OPTION_VALUE_MAX)]));
    const chosen: Record<string, string> = {};
    let matches = given.size === options.length;
    for (const option of options) {
      const value = given.get(option.name);
      if (!value || !option.values.includes(value)) {
        matches = false;
        break;
      }
      chosen[option.name] = value;
    }
    const combination = options.map((option) => chosen[option.name]).join("\u0000");
    if (!matches || combinations.has(combination)) {
      mismatched++;
      continue;
    }
    combinations.add(combination);

    const label = variantLabel({ options: chosen });
    const price = parseMoney(record.price);
    const compare = parseMoney(record.compareAtPrice);
    if (!price.ok) priceProblems.push(`${label}: the price isn't a number.`);
    if (!compare.ok) priceProblems.push(`${label}: the usual price isn't a number.`);
    if (price.ok && compare.ok && compare.value !== null && compare.value <= (price.value ?? productPrice)) {
      priceProblems.push(`${label}: the usual price should be higher than its price (or blank).`);
    }

    let id = typeof record.id === "string" && UUID.test(record.id) ? record.id.toLowerCase() : randomUUID();
    if (ids.has(id)) id = randomUUID();
    ids.add(id);
    const imageSrc = typeof record.imageSrc === "string" ? record.imageSrc : "";
    const imageIndex = imageSrc ? gallery.findIndex((photo) => photo.src === imageSrc) : -1;

    variants.push({
      id,
      options: chosen,
      price: price.value,
      compareAtPrice: compare.value,
      sku: cleanText(record.sku, 100),
      stockStatus: isStockStatus(record.stockStatus) ? record.stockStatus : "in_stock",
      imageIndex: imageIndex >= 0 ? imageIndex : null,
    });
  }

  if (mismatched > 0) {
    problems.push(
      `${mismatched === 1 ? "One variant doesn't" : `${mismatched} variants don't`} match the options any more. Press “Create variants” to update the list (prices you've set carry over where they still fit), then save.`,
    );
  }
  problems.push(...priceProblems.slice(0, 3));
  if (priceProblems.length > 3) problems.push(`…and ${priceProblems.length - 3} more variant prices to check.`);
  return { variants, problems };
}

/** Specification rows ({ label, value }); fully empty rows are dropped, half-filled ones are flagged. */
export function readSpecifications(formData: FormData): { specifications: { label: string; value: string }[]; problems: string[] } {
  const specifications: { label: string; value: string }[] = [];
  let halfFilled = false;
  for (const item of jsonArray(formData.get("specifications")).slice(0, 100)) {
    const record = asRecord(item);
    const label = cleanText(record.label, 80);
    const value = cleanText(record.value, 300);
    if (!label && !value) continue;
    if (!label || !value) {
      halfFilled = true;
      continue;
    }
    specifications.push({ label, value });
  }
  const problems: string[] = [];
  if (halfFilled) problems.push("Specifications: fill in both the name and the value of each row (or remove the row).");
  if (specifications.length > PRODUCT_LIMITS.specifications) problems.push(`Up to ${PRODUCT_LIMITS.specifications} specifications.`);
  return { specifications: specifications.slice(0, PRODUCT_LIMITS.specifications), problems };
}

/** Catch Markdown/MDX mistakes (a stray "<", an unclosed tag) and unsafe tags before they reach the product page. */
export function checkDescription(markdown: string): Promise<string | null> {
  return checkSafeMdx(markdown, "The description");
}

/** Every product field from the editor, checked. `problems` empty = safe to save. */
export async function readProductForm(db: Db, formData: FormData): Promise<{ values: ProductValues; slugInput: string; problems: string[] }> {
  const problems: string[] = [];
  const name = str(formData, "name", 200);
  const summary = str(formData, "summary", 400);
  const slugInput = str(formData, "slug", 120).toLowerCase();
  const description = String(formData.get("description") ?? "")
    .replace(/\r\n/g, "\n")
    .slice(0, 100_000);
  const published = bool(formData, "published");

  if (!name) problems.push("Give the product a name.");
  if (!summary) problems.push("Add a one-sentence summary (the shop's cards and search results show it).");
  if (slugInput && !SLUG_PATTERN.test(slugInput)) problems.push("The address may only use lowercase letters, digits and single hyphens.");

  // Price and discount.
  const price = parseMoney(formData.get("price"));
  const compare = parseMoney(formData.get("compare_at_price"));
  if (!price.ok) problems.push("Price: enter a number, like 1500 or 1499.50.");
  else if (price.value === null) problems.push("Enter the price (for example 1500).");
  if (!compare.ok) problems.push("Usual price: enter a number, or leave it blank.");
  else if (price.value !== null && compare.value !== null && compare.value <= price.value) {
    problems.push("The usual price is the price before a discount, so it should be higher than the price. Leave it blank when there's no discount.");
  }
  const currencyInput = str(formData, "currency", 3).toUpperCase();
  const currency = /^[A-Z]{3}$/.test(currencyInput) ? currencyInput : "NPR";

  // Stock and order limits.
  const stockStatus = formData.get("stock_status");
  const stockQuantity = wholeNumber(formData, "stock_quantity");
  if (Number.isNaN(stockQuantity) || (stockQuantity !== null && stockQuantity > 1_000_000)) problems.push("Stock quantity: a whole number, or blank.");
  const minQuantity = wholeNumber(formData, "min_order_quantity") ?? 1;
  const maxQuantity = wholeNumber(formData, "max_order_quantity");
  if (Number.isNaN(minQuantity) || minQuantity < 1 || minQuantity > PRODUCT_LIMITS.quantity) {
    problems.push(`Minimum per order: a whole number from 1 to ${PRODUCT_LIMITS.quantity}.`);
  } else if (maxQuantity !== null && (Number.isNaN(maxQuantity) || maxQuantity < minQuantity || maxQuantity > PRODUCT_LIMITS.quantity)) {
    problems.push(`Maximum per order: a whole number from the minimum (${minQuantity}) to ${PRODUCT_LIMITS.quantity}, or blank for no limit.`);
  }

  // Category: must exist (a stale form after a category was deleted saves without one instead of failing).
  const categoryInput = str(formData, "category_id", 40);
  let categoryId: string | null = null;
  if (categoryInput && UUID.test(categoryInput)) {
    const { data } = await db.from("product_categories").select("id").eq("id", categoryInput).maybeSingle();
    categoryId = data?.id ?? null;
  }

  // Photos, from the media library only; the share image likewise.
  const sentPhotos = jsonArray(formData.get("images")).length;
  const [images, ogImage] = await Promise.all([galleryFromForm(db, formData, "images", PRODUCT_LIMITS.photos), imageFromForm(db, formData, "og_image")]);
  if (sentPhotos > PRODUCT_LIMITS.photos) problems.push(`Up to ${PRODUCT_LIMITS.photos} photos.`);
  else if (images.length < sentPhotos) {
    const missing = sentPhotos - images.length;
    problems.push(`${missing === 1 ? "One photo isn't" : `${missing} photos aren't`} in the photo library any more (deleted, or added twice). Remove ${missing === 1 ? "it" : "them"} and add again.`);
  }
  if (published && images.length === 0) problems.push("Add at least one photo before publishing: the shop shows it on the product's card.");

  const { options, problems: optionProblems } = readOptions(formData);
  problems.push(...optionProblems);
  const { variants, problems: variantProblems } = optionProblems.length ? { variants: [], problems: [] } : readVariants(formData, options, images, price.value ?? 0);
  problems.push(...variantProblems);
  const { specifications, problems: specificationProblems } = readSpecifications(formData);
  problems.push(...specificationProblems);

  const values: ProductValues = {
    name,
    name_ne: str(formData, "name_ne", 200),
    category_id: categoryId,
    summary,
    description,
    highlights: lines(formData, "highlights", PRODUCT_LIMITS.highlights).map((line) => line.replace(/^[-•*]\s*/, "").slice(0, 200)).filter(Boolean),
    images,
    price: price.value ?? 0,
    compare_at_price: compare.value,
    currency,
    sku: str(formData, "sku", 100),
    stock_status: isStockStatus(stockStatus) ? stockStatus : "in_stock",
    stock_quantity: stockQuantity !== null && !Number.isNaN(stockQuantity) ? stockQuantity : null,
    options,
    variants,
    specifications,
    delivery_info: str(formData, "delivery_info", 1000),
    warranty_info: str(formData, "warranty_info", 1000),
    min_order_quantity: Number.isNaN(minQuantity) ? 1 : minQuantity,
    max_order_quantity: maxQuantity !== null && !Number.isNaN(maxQuantity) ? maxQuantity : null,
    featured: bool(formData, "featured"),
    published,
    sort_order: Math.max(-1_000_000, Math.min(1_000_000, int(formData, "sort_order", 0))),
    seo_title: str(formData, "seo_title", 120),
    seo_description: str(formData, "seo_description", 300),
    og_image: ogImage,
  };
  return { values, slugInput, problems };
}
