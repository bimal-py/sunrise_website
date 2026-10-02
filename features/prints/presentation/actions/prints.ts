"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAG } from "@/lib/cache/tags";
import { routes } from "@/lib/routes";
import { notifyIndexNow } from "@/lib/seo/indexnow";
import type { PrintMockup } from "@/lib/supabase/types";
import { requireAdminAction } from "@/features/dashboard/data/auth";
import { str } from "@/features/dashboard/data/form";
import { readOffering, readPairs } from "@/features/dashboard/data/offering-form";
import { moveRow } from "@/features/dashboard/data/ordering";
import { recordMove, uniqueSlug } from "@/features/dashboard/data/slugs";
import type { ActionState } from "@/features/dashboard/presentation/components/form-controls";

const MOCKUPS: PrintMockup[] = ["album", "frame", "canvas", "loose-prints", "book"];

export async function savePrint(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "id", 40);
  const { values, slugInput, problems } = readOffering(formData);
  const mockup = str(formData, "mockup", 20) as PrintMockup;
  if (problems.length) return { status: "error", message: problems.join(" ") };

  const row = {
    ...values,
    highlight: str(formData, "highlight", 80),
    options_heading: str(formData, "options_heading", 80),
    options: readPairs(formData, "options"),
    mockup: MOCKUPS.includes(mockup) ? mockup : null,
    preview_film_ids: str(formData, "preview_film_ids", 200).split(",").filter((v) => /^[A-Za-z0-9_-]{11}$/.test(v)).slice(0, 3),
  };

  if (!id) {
    const slug = await uniqueSlug(supabase, "prints", slugInput || values.name);
    const { data, error } = await supabase.from("prints").insert({ ...row, slug }).select("id").single();
    if (error) return { status: "error", message: `Couldn't create: ${error.message}` };
    updateTag(TAG.prints);
    if (values.published) notifyIndexNow([routes.print(slug), routes.prints()]);
    redirect(routes.dashboardItem("prints", data.id));
  }

  const { data: current } = await supabase.from("prints").select("slug").eq("id", id).single();
  if (!current) return { status: "error", message: "That print no longer exists." };
  const slug = slugInput && slugInput !== current.slug ? await uniqueSlug(supabase, "prints", slugInput, current.slug) : current.slug;
  const { error } = await supabase.from("prints").update({ ...row, slug }).eq("id", id);
  if (error) return { status: "error", message: `Couldn't save: ${error.message}` };
  if (slug !== current.slug) {
    await recordMove(supabase, routes.print(current.slug), routes.print(slug), "Print renamed");
    updateTag(TAG.redirects);
  }
  // Services list their related prints by name and link: refresh them too (the services cache is tagged "prints").
  updateTag(TAG.prints);
  if (values.published) notifyIndexNow([routes.print(slug), routes.prints()]);
  return { status: "success", message: slug !== current.slug ? `Saved. The old address now redirects to /prints/${slug}.` : "Saved. The site shows it on the next visit." };
}

export async function movePrint(formData: FormData) {
  const { supabase } = await requireAdminAction();
  await moveRow(supabase, "prints", str(formData, "id", 40), formData.get("direction") === "up" ? "up" : "down");
  updateTag(TAG.prints);
  refresh();
}

export async function deletePrint(formData: FormData) {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "id", 40);
  const { data: print } = await supabase.from("prints").select("slug").eq("id", id).single();
  // Services that listed this print drop it.
  const { data: services } = await supabase.from("services").select("id, related_print_ids").contains("related_print_ids", [id]);
  for (const service of services ?? []) {
    await supabase.from("services").update({ related_print_ids: service.related_print_ids.filter((pid) => pid !== id) }).eq("id", service.id);
  }
  const { error } = await supabase.from("prints").delete().eq("id", id);
  if (error) throw new Error(error.message);
  if (print) await recordMove(supabase, routes.print(print.slug), routes.prints(), "Print removed");
  updateTag(TAG.prints);
  updateTag(TAG.services);
  updateTag(TAG.redirects);
  redirect(routes.dashboardSection("prints"));
}
