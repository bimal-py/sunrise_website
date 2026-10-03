import { isOrderable, offerFor, type Product, type ProductOption, type ProductVariant } from "@/features/merchandise/domain/entities";

/**
 * Choosing options on a product page, Daraz-style: one value per option group, the variant
 * that combination makes (its price, stock, SKU and photo), and which values can be chosen
 * from where the buyer is now. Pure functions, shared by the page (browser) and the order
 * action (server), so both always agree on what was chosen and what it costs.
 */

/** Option name → chosen value, e.g. { Size: "8×10 in", Frame: "Walnut" }. */
export type Selection = Record<string, string>;

/** What the product page and the order action need to know about a product. */
export type PurchasableProduct = Pick<
  Product,
  "id" | "slug" | "name" | "currency" | "price" | "compareAtPrice" | "sku" | "stockStatus" | "options" | "variants" | "minOrderQuantity" | "maxOrderQuantity"
>;

type WithOptions = Pick<Product, "options" | "variants">;

/**
 * How a value chip looks from the current selection:
 *  - selected: chosen now;
 *  - available: choosing it keeps the other choices, and that combination can be ordered;
 *  - elsewhere: it can be ordered, but only with other choices (choosing it switches them);
 *  - unavailable: nothing with this value can be ordered (disabled).
 */
export type ValueState = "selected" | "available" | "elsewhere" | "unavailable";

/** The form field carrying the value chosen in option group `index`. */
export function optionFieldName(index: number): string {
  return `option-${index}`;
}

/** Option groups a buyer can choose from: named, with at least one value, no repeats. */
export function optionGroups(options: ProductOption[]): ProductOption[] {
  const groups: ProductOption[] = [];
  const names = new Set<string>();
  for (const option of options ?? []) {
    if (!option || typeof option.name !== "string" || !option.name.trim() || names.has(option.name)) continue;
    const values = [...new Set((option.values ?? []).filter((value): value is string => typeof value === "string" && value.trim() !== ""))];
    if (values.length === 0) continue;
    names.add(option.name);
    groups.push({ name: option.name, values });
  }
  return groups;
}

/** Whether choices come from variants (each combination with its own price and stock). */
export function usesVariants(product: WithOptions): boolean {
  return product.variants.length > 0 && optionGroups(product.options).length > 0;
}

/** A variant's value for a group; undefined = the variant doesn't depend on that group. */
function ownValue(variant: ProductVariant, group: string): string | undefined {
  const value = variant.options?.[group];
  return typeof value === "string" ? value : undefined;
}

/** Every value the variant names belongs to its group (a variant left over from old options never shows). */
function fitsGroups(variant: ProductVariant, groups: ProductOption[]): boolean {
  return groups.every((group) => {
    const value = ownValue(variant, group.name);
    return value === undefined || group.values.includes(value);
  });
}

/** The variant agrees with the selection in every group (except `skip`). */
function agrees(variant: ProductVariant, selection: Selection, groups: ProductOption[], skip?: string): boolean {
  return groups.every((group) => {
    if (group.name === skip) return true;
    const value = ownValue(variant, group.name);
    return value === undefined || selection[group.name] === undefined || value === selection[group.name];
  });
}

/** The selection a variant stands for (groups it doesn't name keep `base`'s value). */
function selectionOf(variant: ProductVariant, groups: ProductOption[], base: Selection): Selection {
  const next = { ...base };
  for (const group of groups) {
    const value = ownValue(variant, group.name);
    if (value !== undefined && group.values.includes(value)) next[group.name] = value;
  }
  return next;
}

/** The variant a full selection makes (an orderable one first if two match), or null. */
export function findVariant(product: WithOptions, selection: Selection): ProductVariant | null {
  const groups = optionGroups(product.options);
  if (groups.length === 0 || product.variants.length === 0) return null;
  if (groups.some((group) => selection[group.name] === undefined)) return null;
  const matches = product.variants.filter((variant) => fitsGroups(variant, groups) && agrees(variant, selection, groups));
  return matches.find((variant) => isOrderable(variant.stockStatus)) ?? matches[0] ?? null;
}

/** What the page starts with: the first variant that can be ordered (else the first), or each group's first value. */
export function initialSelection(product: WithOptions): Selection {
  const groups = optionGroups(product.options);
  const base: Selection = Object.fromEntries(groups.map((group) => [group.name, group.values[0]]));
  if (groups.length === 0 || product.variants.length === 0) return base;
  const usable = product.variants.filter((variant) => fitsGroups(variant, groups));
  const first = usable.find((variant) => isOrderable(variant.stockStatus)) ?? usable[0];
  return first ? selectionOf(first, groups, base) : base;
}

/** How the chip for `value` in `group` should look, given the selection. */
export function valueState(product: WithOptions, selection: Selection, group: string, value: string): ValueState {
  if (selection[group] === value) return "selected";
  if (!usesVariants(product)) return "available";
  const groups = optionGroups(product.options);
  const orderable = product.variants.filter((variant) => {
    const own = ownValue(variant, group);
    return (own === undefined || own === value) && fitsGroups(variant, groups) && isOrderable(variant.stockStatus);
  });
  if (orderable.length === 0) return "unavailable";
  return orderable.some((variant) => agrees(variant, selection, groups, group)) ? "available" : "elsewhere";
}

/**
 * Choose `value` in `group`. If that combination can't be ordered, the other groups switch
 * to the closest variant that can (keeping as many of the buyer's choices as possible), so
 * no chip is ever a dead end.
 */
export function selectValue(product: WithOptions, selection: Selection, group: string, value: string): Selection {
  const next = { ...selection, [group]: value };
  if (!usesVariants(product)) return next;
  const direct = findVariant(product, next);
  if (direct && isOrderable(direct.stockStatus)) return next;

  const groups = optionGroups(product.options);
  const withValue = product.variants.filter((variant) => {
    const own = ownValue(variant, group);
    return (own === undefined || own === value) && fitsGroups(variant, groups);
  });
  const orderable = withValue.filter((variant) => isOrderable(variant.stockStatus));
  const pool = orderable.length > 0 ? orderable : withValue;
  const kept = (variant: ProductVariant) =>
    groups.filter((g) => g.name !== group && (ownValue(variant, g.name) === undefined || ownValue(variant, g.name) === selection[g.name])).length;
  let best: ProductVariant | null = null;
  for (const variant of pool) if (!best || kept(variant) > kept(best)) best = variant;
  return best ? { ...selectionOf(best, groups, next), [group]: value } : next;
}

/** "Size: 8×10 in · Frame: Walnut", in the product's group order. */
export function selectionLabel(groups: ProductOption[], selection: Selection): string {
  return groups
    .filter((group) => selection[group.name])
    .map((group) => `${group.name}: ${selection[group.name]}`)
    .join(" · ");
}

/** The photo a variant asks for, when it names one the product has. */
export function variantImageIndex(variant: ProductVariant | null, imageCount: number): number | null {
  const index = variant?.imageIndex;
  return typeof index === "number" && Number.isInteger(index) && index >= 0 && index < imageCount ? index : null;
}

/** Quantity bounds for one order: the product's limits, within what an order message can hold (1–1000). */
export function quantityLimits(product: Pick<Product, "minOrderQuantity" | "maxOrderQuantity">): { min: number; max: number } {
  const min = Math.min(1000, Math.max(1, Math.floor(product.minOrderQuantity || 1)));
  const max = Math.min(1000, Math.max(min, Math.floor(product.maxOrderQuantity ?? 1000)));
  return { min, max };
}

/**
 * The buyer's choices sent with an order (field `option-<i>` per group), checked against the
 * product as it is now: every group needs one of its own values, and with variants the
 * combination has to exist.
 */
export function resolveSelection(
  product: WithOptions,
  picked: (string | null | undefined)[],
): { ok: true; selection: Selection; variant: ProductVariant | null } | { ok: false; error: string } {
  const groups = optionGroups(product.options);
  const selection: Selection = {};
  for (const [index, group] of groups.entries()) {
    const value = picked[index];
    if (!value || !group.values.includes(value)) return { ok: false, error: `Please choose the ${group.name.toLowerCase()} again: the options have changed.` };
    selection[group.name] = value;
  }
  if (!usesVariants(product)) return { ok: true, selection, variant: null };
  const variant = findVariant(product, selection);
  if (!variant) return { ok: false, error: "That combination isn't available. Please choose another." };
  return { ok: true, selection, variant };
}

/**
 * What a product card shows: the lowest price that can be ordered (with its usual price and
 * discount), "From" when the variants cost different amounts, and whether all of it is sold out.
 */
export function cardOffer(product: Pick<Product, "price" | "compareAtPrice" | "stockStatus" | "sku" | "options" | "variants">) {
  if (!usesVariants(product)) {
    const offer = offerFor(product, null);
    return { ...offer, from: false, soldOut: !isOrderable(offer.stockStatus) };
  }
  const groups = optionGroups(product.options);
  const offers = product.variants.filter((variant) => fitsGroups(variant, groups)).map((variant) => offerFor(product, variant));
  if (offers.length === 0) {
    const offer = offerFor(product, null);
    return { ...offer, from: false, soldOut: !isOrderable(offer.stockStatus) };
  }
  const orderable = offers.filter((offer) => isOrderable(offer.stockStatus));
  const pool = orderable.length > 0 ? orderable : offers;
  const lowest = pool.reduce((best, offer) => (offer.price < best.price ? offer : best));
  return { ...lowest, from: new Set(pool.map((offer) => offer.price)).size > 1, soldOut: orderable.length === 0 };
}
