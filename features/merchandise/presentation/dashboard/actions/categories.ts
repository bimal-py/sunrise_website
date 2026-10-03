"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAG } from "@/lib/cache/tags";
import { requireAdminAction } from "@/features/dashboard/data/auth";
import { bool, int, str } from "@/features/dashboard/data/form";
import { imageFromForm } from "@/features/dashboard/data/image-input";
import { SLUG_PATTERN } from "@/features/dashboard/data/slugs";
import type { ActionState } from "@/features/dashboard/presentation/components/ui/action-state";
import { cleanText } from "../catalogue-options";
import { moveWithin, nextSortOrder, uniqueSlugIn, UUID } from "../server/catalogue-admin";
import { categoriesList, listUrl, withNotice } from "../server/list-urls";

/**
 * Product categories (dashboard → Merchandise → Categories). The shop's category filter is a
 * query on the merchandise page (?category=<slug>), so renaming a slug needs no redirect.
 * Deleting one leaves its products in the shop without a category (the database sets
 * products.category_id to null).
 */

export async function saveCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "id", 40);
  if (id && !UUID.test(id)) return { status: "error", message: "That category couldn't be found. Open it again from the list." };
  const name = str(formData, "name", 120);
  const slugInput = str(formData, "slug", 120).toLowerCase();
  const problems: string[] = [];
  if (!name) problems.push("Give the category a name.");
  if (slugInput && !SLUG_PATTERN.test(slugInput)) problems.push("The address may only use lowercase letters, digits and single hyphens.");
  if (problems.length) return { status: "error", message: problems.join(" ") };

  const values = {
    name,
    name_ne: str(formData, "name_ne", 120),
    description: str(formData, "description", 1000),
    image: await imageFromForm(supabase, formData, "image"),
    published: bool(formData, "published"),
    sort_order: Math.max(-1_000_000, Math.min(1_000_000, int(formData, "sort_order", 0))),
    seo_title: str(formData, "seo_title", 120),
    seo_description: str(formData, "seo_description", 300),
  };

  if (!id) {
    const slug = await uniqueSlugIn(supabase, "product_categories", slugInput || name);
    const { error } = await supabase.from("product_categories").insert({ ...values, slug });
    if (error) return { status: "error", message: `Couldn't create the category: ${error.message}` };
    // Nothing to refresh yet: the shop lists a category once a published product is in it (that save refreshes it).
  } else {
    const { data: current, error: readError } = await supabase.from("product_categories").select("slug, published").eq("id", id).maybeSingle();
    if (readError) return { status: "error", message: `Couldn't save the category: ${readError.message}` };
    if (!current) return { status: "error", message: "That category no longer exists (it may have been deleted)." };
    const slug = slugInput && slugInput !== current.slug ? await uniqueSlugIn(supabase, "product_categories", slugInput, current.slug) : current.slug;
    const { error } = await supabase.from("product_categories").update({ ...values, slug }).eq("id", id);
    if (error) return { status: "error", message: `Couldn't save the category: ${error.message}` };
    if (current.published || values.published) updateTag(TAG.products);
  }
  redirect(withNotice(categoriesList(), "saved", name));
}

export async function deleteCategory(formData: FormData) {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "id", 40);
  if (!UUID.test(id)) throw new Error("That category couldn't be found.");
  const { data: category } = await supabase.from("product_categories").select("name").eq("id", id).maybeSingle();
  const { error } = await supabase.from("product_categories").delete().eq("id", id);
  if (error) throw new Error(`Couldn't delete the category: ${error.message}`);
  // Its products lost their category: their pages and the shop's filter change.
  updateTag(TAG.products);
  redirect(withNotice(listUrl(formData.get("back"), categoriesList()), "deleted", category?.name ?? "The category"));
}

/** ↑/↓ on the categories list: the order of the shop's category filter. */
export async function moveCategory(formData: FormData) {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "id", 40);
  if (!UUID.test(id)) return;
  const moved = await moveWithin(supabase, "product_categories", id, formData.get("direction") === "up" ? "up" : "down");
  if (moved) updateTag(TAG.products);
  refresh();
}

export type InlineCategoryResult = { ok: true; category: { id: string; name: string } } | { ok: false; error: string };

/**
 * "New category" from the product editor: creates a published category by name (or finds
 * the one already called that) without leaving the form. Returns the result instead of
 * throwing, so the dialog can say what went wrong.
 */
export async function createCategoryInline(rawName: string): Promise<InlineCategoryResult> {
  try {
    const { supabase } = await requireAdminAction();
    const name = cleanText(rawName, 120);
    if (!name) return { ok: false, error: "Give the category a name." };
    // One already called that (any capitalisation)? Use it rather than making a twin.
    const { data: existing, error: readError } = await supabase.from("product_categories").select("id, name").limit(1000);
    if (readError) return { ok: false, error: `Couldn't create the category: ${readError.message}` };
    const sameName = existing.find((category) => category.name.toLowerCase() === name.toLowerCase());
    if (sameName) return { ok: true, category: sameName };
    const [slug, sortOrder] = await Promise.all([uniqueSlugIn(supabase, "product_categories", name), nextSortOrder(supabase, "product_categories")]);
    const { data, error } = await supabase.from("product_categories").insert({ name, slug, published: true, sort_order: sortOrder }).select("id, name").single();
    if (error) return { ok: false, error: `Couldn't create the category: ${error.message}` };
    // Not on the site yet: the shop lists a category once a published product is in it (that save refreshes the shop).
    return { ok: true, category: data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Couldn't create the category. Try again." };
  }
}
