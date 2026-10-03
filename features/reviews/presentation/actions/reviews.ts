"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAG } from "@/lib/cache/tags";
import { routes } from "@/lib/routes";
import type { ReviewSource } from "@/lib/supabase/types";
import { requireAdminAction } from "@/features/dashboard/data/auth";
import { int, str, url } from "@/features/dashboard/data/form";
import type { ActionState } from "@/features/dashboard/presentation/components/ui/action-state";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const SOURCES: ReviewSource[] = ["Facebook", "Google", "YouTube", "In person"];
const LIST = routes.dashboardSection("reviews");

/** Back to the list, which says what happened ("Saved the review from …"); `draft` adds that it isn't on the site. */
function backToList(outcome: "saved" | "deleted", label: string, draft = false): never {
  redirect(`${LIST}?${outcome}=${encodeURIComponent(label.slice(0, 80))}${draft ? "&state=draft" : ""}`);
}

/**
 * Adds (no id) or saves a review, then goes back to the list. Reviews are real or absent:
 * every one names where it was posted, and links there unless it was given in person.
 */
export async function saveReview(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "id", 40);
  if (id && !UUID.test(id)) return { status: "error", message: "That review no longer exists. Reload the page." };

  const sourceInput = str(formData, "source_label", 20);
  const source = SOURCES.find((entry) => entry === sourceInput) ?? null;
  const link = url(formData, "source_url");
  const month = str(formData, "review_month", 7);
  const row = {
    name: str(formData, "name", 120),
    occasion: str(formData, "occasion", 80),
    place: str(formData, "place", 80),
    review_month: month || null,
    rating: Math.min(5, Math.max(1, int(formData, "rating", 5))),
    body: str(formData, "body", 4000),
    source_label: source,
    source_url: link.value,
    published: formData.get("status") !== "draft",
    sort_order: Math.max(-100_000, Math.min(100_000, int(formData, "sort_order", 0))),
  };

  const problems: string[] = [];
  if (!row.name) problems.push("Add the client's name as they agreed to be named.");
  if (!row.body) problems.push("Add their words, exactly as they wrote them.");
  if (!source) problems.push("Choose where the review was posted (or “In person” if they gave it to you).");
  if (month && !MONTH.test(month)) problems.push("Month: use the picker (YYYY-MM).");
  if (link.error) problems.push(`Review link: ${link.error}`);
  if (source && source !== "In person" && !row.source_url) problems.push(`Add the link to the review on ${source}, so anyone can check it.`);
  if (problems.length > 0) return { status: "error", message: problems.join(" ") };

  if (!id) {
    const { error } = await supabase.from("reviews").insert(row);
    if (error) return { status: "error", message: `Couldn't add the review: ${error.message}` };
  } else {
    const { data, error } = await supabase.from("reviews").update(row).eq("id", id).select("id");
    if (error) return { status: "error", message: `Couldn't save the review: ${error.message}` };
    if (data.length === 0) return { status: "error", message: "That review no longer exists. Reload the page." };
  }
  updateTag(TAG.reviews);
  backToList("saved", row.name, !row.published);
}

export async function deleteReview(formData: FormData): Promise<void> {
  const { supabase } = await requireAdminAction();
  const id = str(formData, "id", 40);
  if (!UUID.test(id)) throw new Error("That review couldn't be found. Reload the page and try again.");
  const { data, error } = await supabase.from("reviews").delete().eq("id", id).select("name");
  if (error) throw new Error(`Couldn't delete the review: ${error.message}`);
  updateTag(TAG.reviews);
  if (data.length === 0) redirect(LIST);
  backToList("deleted", data[0].name);
}
