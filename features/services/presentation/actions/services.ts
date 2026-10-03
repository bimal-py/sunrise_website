"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAG } from "@/lib/cache/tags";
import { routes } from "@/lib/routes";
import { notifyIndexNow } from "@/lib/seo/indexnow";
import type { FilmCategoryValue } from "@/lib/supabase/types";
import { requireAdminAction } from "@/features/dashboard/data/auth";
import { str } from "@/features/dashboard/data/form";
import { readImageField, readOffering, readOfferingIcon } from "@/features/dashboard/data/offering-form";
import { moveRow } from "@/features/dashboard/data/ordering";
import { recordMove, uniqueSlug } from "@/features/dashboard/data/slugs";
import type { ActionState } from "@/features/dashboard/presentation/components/ui/action-state";

const CATEGORIES: FilmCategoryValue[] = ["weddings", "ceremonies", "culture"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

const listHref = (notice: Record<string, string>) => `${routes.dashboardSection("services")}?${new URLSearchParams(notice).toString()}`;

/** Create or update a service, then go back to the list (the list says what was saved). */
export async function saveService(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "id", 40);
  if (id && !UUID.test(id)) return { status: "error", message: "That service no longer exists." };

  const { data: current } = id
    ? await supabase.from("services").select("slug, published, icon, icon_source, icon_svg, og_image").eq("id", id).maybeSingle()
    : { data: null };
  if (id && !current) return { status: "error", message: "That service no longer exists. It may have been deleted." };

  const { values, slugInput, problems } = readOffering(formData);
  const filmCategory = str(formData, "film_category", 20) as FilmCategoryValue;
  const coverFilmInput = str(formData, "cover_film_id", 20);
  const printInput = [...new Set(formData.getAll("related_print_ids").map(String))].filter((value) => UUID.test(value)).slice(0, 50);

  const [icon, ogImage, coverFilm, prints] = await Promise.all([
    readOfferingIcon(formData, current),
    readImageField(supabase, formData, "og_image", current?.og_image ?? null),
    VIDEO_ID.test(coverFilmInput) ? supabase.from("films").select("youtube_id").eq("youtube_id", coverFilmInput).maybeSingle() : Promise.resolve({ data: null }),
    printInput.length ? supabase.from("prints").select("id").in("id", printInput) : Promise.resolve({ data: [] as { id: string }[] }),
  ]);
  if (!icon.ok) problems.push(icon.error);
  if (!ogImage.ok) problems.push(`Share image: ${ogImage.error}`);
  if (coverFilmInput && !coverFilm.data) problems.push("The still for the shot list is from a film that's no longer on the site. Choose another.");
  if (problems.length || !icon.ok || !ogImage.ok) return { status: "error", message: problems.join(" ") };

  const knownPrints = new Set((prints.data ?? []).map((print) => print.id));
  const row = {
    ...values,
    ...icon.values,
    og_image: ogImage.image,
    short_name: str(formData, "short_name", 60) || values.name.slice(0, 60),
    film_category: CATEGORIES.includes(filmCategory) ? filmCategory : null,
    cover_film_id: coverFilm.data ? coverFilmInput : null,
    related_print_ids: printInput.filter((printId) => knownPrints.has(printId)),
  };

  if (!current) {
    const slug = await uniqueSlug(supabase, "services", slugInput || values.name);
    const { error } = await supabase.from("services").insert({ ...row, slug });
    if (error) return { status: "error", message: `Couldn't create the service: ${error.message}` };
    updateTag(TAG.services);
    if (values.published) notifyIndexNow([routes.service(slug), routes.services()]);
    redirect(listHref({ saved: values.name }));
  }

  const slug = slugInput && slugInput !== current.slug ? await uniqueSlug(supabase, "services", slugInput, current.slug) : current.slug;
  const { error } = await supabase.from("services").update({ ...row, slug }).eq("id", id);
  if (error) return { status: "error", message: `Couldn't save the service: ${error.message}` };
  if (slug !== current.slug) {
    await recordMove(supabase, routes.service(current.slug), routes.service(slug), "Service renamed");
    updateTag(TAG.redirects);
  }
  updateTag(TAG.services);
  // Unpublishing is news too: search engines drop the page sooner.
  if (values.published || current.published) notifyIndexNow([routes.service(slug), routes.services()]);
  redirect(listHref(slug !== current.slug ? { saved: values.name, moved: slug } : { saved: values.name }));
}

/** One place up or down in the site's order (the list's arrows). */
export async function moveService(formData: FormData) {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "id", 40);
  if (!UUID.test(id)) throw new Error("That service no longer exists.");
  await moveRow(supabase, "services", id, formData.get("direction") === "up" ? "up" : "down");
  updateTag(TAG.services);
  refresh();
}

/** Delete a service; its address then sends visitors to the services page (no 404 for old links). */
export async function deleteService(formData: FormData) {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "id", 40);
  if (!UUID.test(id)) throw new Error("That service no longer exists.");
  const { data: service } = await supabase.from("services").select("slug, name, published").eq("id", id).maybeSingle();
  if (!service) redirect(routes.dashboardSection("services"));
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) throw new Error(`Couldn't delete the service: ${error.message}`);
  await recordMove(supabase, routes.service(service.slug), routes.services(), "Service removed");
  updateTag(TAG.services);
  updateTag(TAG.redirects);
  if (service.published) notifyIndexNow([routes.service(service.slug), routes.services()]);
  redirect(listHref({ deleted: service.name }));
}
