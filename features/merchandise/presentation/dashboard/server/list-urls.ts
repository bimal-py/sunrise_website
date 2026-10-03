import "server-only";
import { merchandisePaths } from "../catalogue-options";

/**
 * Where a merchandise action sends the admin afterwards: back to the list they were on
 * (filters and page kept), with a one-line notice (?saved= or ?deleted=). The address comes
 * from the form, so only the two merchandise lists are accepted.
 */

const LIST = /^\/dashboard\/merchandise(\/categories)?(\?[^#\s]*)?$/;

/** The list address the form sent back (`back`), or `fallback` when it's missing or not one of ours. */
export function listUrl(back: FormDataEntryValue | null, fallback: string): string {
  const value = typeof back === "string" ? back.trim().slice(0, 500) : "";
  return LIST.test(value) ? value : fallback;
}

/** `url` with `key=label` added (and any earlier notice removed). */
export function withNotice(url: string, key: "saved" | "deleted", label: string): string {
  const [path, query = ""] = url.split("?");
  const params = new URLSearchParams(query);
  params.delete("saved");
  params.delete("deleted");
  params.set(key, label.slice(0, 120));
  return `${path}?${params.toString()}`;
}

export const productsList = merchandisePaths.products;
export const categoriesList = merchandisePaths.categories;
