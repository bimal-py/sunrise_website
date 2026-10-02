"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAG } from "@/lib/cache/tags";
import { routes } from "@/lib/routes";
import { notifyIndexNow } from "@/lib/seo/indexnow";
import type { FilmCategoryValue } from "@/lib/supabase/types";
import { requireAdminAction } from "@/features/dashboard/data/auth";
import { str } from "@/features/dashboard/data/form";
import { readOffering } from "@/features/dashboard/data/offering-form";
import { moveRow } from "@/features/dashboard/data/ordering";
import { recordMove, uniqueSlug } from "@/features/dashboard/data/slugs";
import type { ActionState } from "@/features/dashboard/presentation/components/form-controls";

const CATEGORIES: FilmCategoryValue[] = ["weddings", "ceremonies", "culture"];

export async function saveService(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "id", 40);
  const { values, slugInput, problems } = readOffering(formData);
  const filmCategory = str(formData, "film_category", 20) as FilmCategoryValue;
  const coverFilm = str(formData, "cover_film_id", 20) || null;
  const relatedPrints = formData.getAll("related_print_ids").map(String).filter((v) => /^[0-9a-f-]{36}$/.test(v));
  if (problems.length) return { status: "error", message: problems.join(" ") };

  const row = {
    ...values,
    short_name: str(formData, "short_name", 60) || values.name,
    film_category: CATEGORIES.includes(filmCategory) ? filmCategory : null,
    cover_film_id: coverFilm,
    related_print_ids: relatedPrints,
  };

  if (!id) {
    const slug = await uniqueSlug(supabase, "services", slugInput || values.name);
    const { data, error } = await supabase.from("services").insert({ ...row, slug }).select("id").single();
    if (error) return { status: "error", message: `Couldn't create: ${error.message}` };
    updateTag(TAG.services);
    if (values.published) notifyIndexNow([routes.service(slug), routes.services()]);
    redirect(routes.dashboardItem("services", data.id));
  }

  const { data: current } = await supabase.from("services").select("slug").eq("id", id).single();
  if (!current) return { status: "error", message: "That service no longer exists." };
  const slug = slugInput && slugInput !== current.slug ? await uniqueSlug(supabase, "services", slugInput, current.slug) : current.slug;
  const { error } = await supabase.from("services").update({ ...row, slug }).eq("id", id);
  if (error) return { status: "error", message: `Couldn't save: ${error.message}` };
  if (slug !== current.slug) {
    await recordMove(supabase, routes.service(current.slug), routes.service(slug), "Service renamed");
    updateTag(TAG.redirects);
  }
  updateTag(TAG.services);
  if (values.published) notifyIndexNow([routes.service(slug), routes.services()]);
  return { status: "success", message: slug !== current.slug ? `Saved. The old address now redirects to /services/${slug}.` : "Saved. The site shows it on the next visit." };
}

export async function moveService(formData: FormData) {
  const { supabase } = await requireAdminAction();
  await moveRow(supabase, "services", str(formData, "id", 40), formData.get("direction") === "up" ? "up" : "down");
  updateTag(TAG.services);
  refresh();
}

export async function deleteService(formData: FormData) {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "id", 40);
  const { data: service } = await supabase.from("services").select("slug").eq("id", id).single();
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) throw new Error(error.message);
  if (service) await recordMove(supabase, routes.service(service.slug), routes.services(), "Service removed");
  updateTag(TAG.services);
  updateTag(TAG.redirects);
  redirect(routes.dashboardSection("services"));
}
