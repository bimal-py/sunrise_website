"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAG } from "@/lib/cache/tags";
import { routes } from "@/lib/routes";
import type { ReviewSource } from "@/lib/supabase/types";
import { requireAdminAction } from "@/features/dashboard/data/auth";
import { bool, int, str, url } from "@/features/dashboard/data/form";
import type { ActionState } from "@/features/dashboard/presentation/components/form-controls";

const SOURCES: ReviewSource[] = ["Facebook", "Google", "YouTube", "In person"];

export async function saveReview(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "id", 40);
  const source = str(formData, "source_label", 20) as ReviewSource;
  const link = url(formData, "source_url");
  const month = str(formData, "review_month", 7);
  const rating = Math.min(5, Math.max(1, int(formData, "rating", 5)));
  const row = {
    name: str(formData, "name", 120),
    occasion: str(formData, "occasion", 80),
    place: str(formData, "place", 80),
    review_month: month || null,
    rating,
    body: str(formData, "body", 4000),
    source_label: SOURCES.includes(source) ? source : null,
    source_url: link.value,
    published: bool(formData, "published"),
    sort_order: int(formData, "sort_order", 0),
  };
  const problems: string[] = [];
  if (!row.name) problems.push("Add the client's name as they agreed to be named.");
  if (!row.body) problems.push("Add their words.");
  if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) problems.push("Month: use the picker (YYYY-MM).");
  if (link.error) problems.push(`Link: ${link.error}`);
  if (row.source_label && row.source_label !== "In person" && !row.source_url) problems.push(`Add the link to the review on ${row.source_label} so anyone can check it.`);
  if (problems.length) return { status: "error", message: problems.join(" ") };

  if (!id) {
    const { data, error } = await supabase.from("reviews").insert(row).select("id").single();
    if (error) return { status: "error", message: `Couldn't create: ${error.message}` };
    updateTag(TAG.reviews);
    redirect(routes.dashboardItem("reviews", data.id));
  }
  const { error } = await supabase.from("reviews").update(row).eq("id", id);
  if (error) return { status: "error", message: `Couldn't save: ${error.message}` };
  updateTag(TAG.reviews);
  return { status: "success", message: "Saved. The home page shows it on the next visit." };
}

export async function deleteReview(formData: FormData) {
  const { supabase } = await requireAdminAction();
  const { error } = await supabase.from("reviews").delete().eq("id", str(formData, "id", 40));
  if (error) throw new Error(error.message);
  updateTag(TAG.reviews);
  redirect(routes.dashboardSection("reviews"));
}
