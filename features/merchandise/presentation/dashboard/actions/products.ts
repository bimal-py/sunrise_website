"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAG } from "@/lib/cache/tags";
import { routes } from "@/lib/routes";
import { notifyIndexNow } from "@/lib/seo/indexnow";
import { requireAdminAction } from "@/features/dashboard/data/auth";
import { str } from "@/features/dashboard/data/form";
import { recordMove } from "@/features/dashboard/data/slugs";
import type { ActionState } from "@/features/dashboard/presentation/components/ui/action-state";
import { clearRedirectAt, moveWithin, uniqueSlugIn, UUID } from "../server/catalogue-admin";
import { listUrl, productsList, withNotice } from "../server/list-urls";
import { checkDescription, readProductForm } from "../server/product-input";

/**
 * Products (dashboard → Merchandise). Only published products are on the site, so a draft's
 * save leaves the public pages alone; anything that changes a published product refreshes
 * the "products" cache tag, which rebuilds the shop's pages on their next visit.
 */

export async function saveProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "id", 40);
  if (id && !UUID.test(id)) return { status: "error", message: "That product couldn't be found. Open it again from the list." };

  const { values, slugInput, problems } = await readProductForm(supabase, formData);
  if (problems.length) return { status: "error", message: problems.join(" ") };
  const descriptionProblem = await checkDescription(values.description);
  if (descriptionProblem) return { status: "error", message: descriptionProblem };

  let slug: string;
  let shopChanged = values.published;
  let redirectsChanged = false;
  const pinged: string[] = [];

  if (!id) {
    slug = await uniqueSlugIn(supabase, "products", slugInput || values.name);
    const { error } = await supabase.from("products").insert({ ...values, slug });
    if (error) return { status: "error", message: `Couldn't create the product: ${error.message}` };
  } else {
    const { data: current, error: readError } = await supabase.from("products").select("slug, published").eq("id", id).maybeSingle();
    if (readError) return { status: "error", message: `Couldn't save the product: ${readError.message}` };
    if (!current) return { status: "error", message: "That product no longer exists (it may have been deleted)." };
    slug = slugInput && slugInput !== current.slug ? await uniqueSlugIn(supabase, "products", slugInput, current.slug) : current.slug;
    const { error } = await supabase.from("products").update({ ...values, slug }).eq("id", id);
    if (error) return { status: "error", message: `Couldn't save the product: ${error.message}` };
    if (current.published) {
      shopChanged = true;
      if (slug !== current.slug) {
        // The old address keeps working: it redirects to the new one.
        await recordMove(supabase, routes.product(current.slug), routes.product(slug), "Product renamed");
        redirectsChanged = true;
      }
      if (slug !== current.slug || !values.published) pinged.push(routes.product(current.slug));
    }
  }

  if (values.published) {
    // A redirect left at this address (an older product's) would hide the live page.
    if (await clearRedirectAt(supabase, routes.product(slug))) redirectsChanged = true;
    pinged.push(routes.product(slug));
  }
  if (shopChanged) updateTag(TAG.products);
  if (redirectsChanged) updateTag(TAG.redirects);
  if (pinged.length) notifyIndexNow([...pinged, routes.merchandise()]);
  redirect(withNotice(listUrl(formData.get("back"), productsList()), "saved", values.name));
}

export async function deleteProduct(formData: FormData) {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "id", 40);
  if (!UUID.test(id)) throw new Error("That product couldn't be found.");
  const { data: product } = await supabase.from("products").select("slug, name, published").eq("id", id).maybeSingle();
  // Orders already received keep their copy of the product's name (product_id is set to null).
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(`Couldn't delete the product: ${error.message}`);
  if (product?.published) {
    await recordMove(supabase, routes.product(product.slug), routes.merchandise(), "Product removed");
    updateTag(TAG.products);
    updateTag(TAG.redirects);
    notifyIndexNow([routes.product(product.slug), routes.merchandise()]);
  }
  redirect(withNotice(listUrl(formData.get("back"), productsList()), "deleted", product?.name ?? "The product"));
}

/** ↑/↓ on the products list: the same order as the shop. */
export async function moveProduct(formData: FormData) {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "id", 40);
  if (!UUID.test(id)) return;
  const moved = await moveWithin(supabase, "products", id, formData.get("direction") === "up" ? "up" : "down");
  if (moved) updateTag(TAG.products);
  refresh();
}
