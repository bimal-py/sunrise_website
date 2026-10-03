"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAG } from "@/lib/cache/tags";
import { routes } from "@/lib/routes";
import { notifyIndexNow } from "@/lib/seo/indexnow";
import type { PrintMockup } from "@/lib/supabase/types";
import { requireAdminAction } from "@/features/dashboard/data/auth";
import { str } from "@/features/dashboard/data/form";
import { readImageField, readOffering, readOfferingIcon, readPairs } from "@/features/dashboard/data/offering-form";
import { moveRow } from "@/features/dashboard/data/ordering";
import { recordMove, uniqueSlug } from "@/features/dashboard/data/slugs";
import type { ActionState } from "@/features/dashboard/presentation/components/ui/action-state";

const MOCKUPS: PrintMockup[] = ["album", "frame", "canvas", "loose-prints", "book"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

const listHref = (notice: Record<string, string>) => `${routes.dashboardSection("prints")}?${new URLSearchParams(notice).toString()}`;

/** Create or update a print, then go back to the list (the list says what was saved). */
export async function savePrint(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "id", 40);
  if (id && !UUID.test(id)) return { status: "error", message: "That print no longer exists." };

  const { data: current } = id
    ? await supabase.from("prints").select("slug, published, icon, icon_source, icon_svg, og_image").eq("id", id).maybeSingle()
    : { data: null };
  if (id && !current) return { status: "error", message: "That print no longer exists. It may have been deleted." };

  const { values, slugInput, problems } = readOffering(formData);
  const mockup = str(formData, "mockup", 20) as PrintMockup;
  const stillInput = [
    ...new Set(
      str(formData, "preview_film_ids", 200)
        .split(",")
        .map((value) => value.trim())
        .filter((value) => VIDEO_ID.test(value)),
    ),
  ].slice(0, 3);

  const [icon, ogImage, stills] = await Promise.all([
    readOfferingIcon(formData, current, "Image"),
    readImageField(supabase, formData, "og_image", current?.og_image ?? null),
    stillInput.length ? supabase.from("films").select("youtube_id").in("youtube_id", stillInput) : Promise.resolve({ data: [] as { youtube_id: string }[] }),
  ]);
  if (!icon.ok) problems.push(icon.error);
  if (!ogImage.ok) problems.push(`Share image: ${ogImage.error}`);
  if (problems.length || !icon.ok || !ogImage.ok) return { status: "error", message: problems.join(" ") };

  const knownFilms = new Set((stills.data ?? []).map((film) => film.youtube_id));
  const row = {
    ...values,
    ...icon.values,
    og_image: ogImage.image,
    highlight: str(formData, "highlight", 80),
    options_heading: str(formData, "options_heading", 80),
    options: readPairs(formData, "options"),
    mockup: MOCKUPS.includes(mockup) ? mockup : null,
    preview_film_ids: stillInput.filter((filmId) => knownFilms.has(filmId)),
  };

  if (!current) {
    const slug = await uniqueSlug(supabase, "prints", slugInput || values.name);
    const { error } = await supabase.from("prints").insert({ ...row, slug });
    if (error) return { status: "error", message: `Couldn't create the print: ${error.message}` };
    updateTag(TAG.prints);
    if (values.published) notifyIndexNow([routes.print(slug), routes.prints()]);
    redirect(listHref({ saved: values.name }));
  }

  const slug = slugInput && slugInput !== current.slug ? await uniqueSlug(supabase, "prints", slugInput, current.slug) : current.slug;
  const { error } = await supabase.from("prints").update({ ...row, slug }).eq("id", id);
  if (error) return { status: "error", message: `Couldn't save the print: ${error.message}` };
  if (slug !== current.slug) {
    await recordMove(supabase, routes.print(current.slug), routes.print(slug), "Print renamed");
    updateTag(TAG.redirects);
  }
  // Services list their related prints by name and link: the services cache is tagged "prints" too.
  updateTag(TAG.prints);
  if (values.published || current.published) notifyIndexNow([routes.print(slug), routes.prints()]);
  redirect(listHref(slug !== current.slug ? { saved: values.name, moved: slug } : { saved: values.name }));
}

/** One place up or down in the site's order (the list's arrows). */
export async function movePrint(formData: FormData) {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "id", 40);
  if (!UUID.test(id)) throw new Error("That print no longer exists.");
  await moveRow(supabase, "prints", id, formData.get("direction") === "up" ? "up" : "down");
  updateTag(TAG.prints);
  refresh();
}

/** Delete a print; services that listed it drop it, and its address sends visitors to the prints page. */
export async function deletePrint(formData: FormData) {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "id", 40);
  if (!UUID.test(id)) throw new Error("That print no longer exists.");
  const { data: print } = await supabase.from("prints").select("slug, name, published").eq("id", id).maybeSingle();
  if (!print) redirect(routes.dashboardSection("prints"));
  const { data: services } = await supabase.from("services").select("id, related_print_ids").contains("related_print_ids", [id]);
  await Promise.all(
    (services ?? []).map((service) =>
      supabase
        .from("services")
        .update({ related_print_ids: service.related_print_ids.filter((printId) => printId !== id) })
        .eq("id", service.id),
    ),
  );
  const { error } = await supabase.from("prints").delete().eq("id", id);
  if (error) throw new Error(`Couldn't delete the print: ${error.message}`);
  await recordMove(supabase, routes.print(print.slug), routes.prints(), "Print removed");
  updateTag(TAG.prints);
  updateTag(TAG.services);
  updateTag(TAG.redirects);
  if (print.published) notifyIndexNow([routes.print(print.slug), routes.prints()]);
  redirect(listHref({ deleted: print.name }));
}
