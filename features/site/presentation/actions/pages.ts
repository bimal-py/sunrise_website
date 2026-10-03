"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAG } from "@/lib/cache/tags";
import { routes } from "@/lib/routes";
import { notifyIndexNow } from "@/lib/seo/indexnow";
import type { PageRow } from "@/lib/supabase/types";
import { requireAdminAction } from "@/features/dashboard/data/auth";
import { imageFromForm } from "@/features/dashboard/data/image-input";
import type { ActionState } from "@/features/dashboard/presentation/components/ui/action-state";
import { getSiteSettings } from "@/features/site/data/settings.repository";
import {
  cleanField,
  fieldDefault,
  fieldMax,
  getPageDefinition,
  isPageKey,
  SEO_DESCRIPTION_MAX,
  SEO_TITLE_MAX,
  tidyLines,
} from "@/features/site/domain/page-content";

const oneLine = (value: FormDataEntryValue | null) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Saves a fixed page's words and search settings (dashboard → Pages → a page), then goes
 * back to the list. A field left as its default is stored as "" ("use the default"), so it
 * keeps following the code.
 */
export async function savePage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdminAction();
  const key = String(formData.get("key") ?? "");
  if (!isPageKey(key)) return { status: "error", message: "Unknown page. Reload the page and try again." };
  const page = getPageDefinition(key);
  // Defaults built from the studio's name compare against the name the site shows.
  const site = await getSiteSettings();

  const problems: string[] = [];
  const checkLength = (label: string, value: string, max: number) => {
    if (value.length > max) problems.push(`${label}: at most ${max} characters (it has ${value.length}).`);
  };
  const patch: Partial<Omit<PageRow, "key" | "updated_at">> = {};

  if (page.fields.length > 0) {
    const content: Record<string, string> = {};
    for (const field of page.fields) {
      const value = cleanField(field, String(formData.get(`content.${field.name}`) ?? ""));
      checkLength(`${field.group}, ${field.label}`, value, fieldMax(field));
      content[field.name] = value === fieldDefault(field, site) ? "" : value;
    }
    patch.content = content;
  }

  if (page.body) {
    const body = tidyLines(String(formData.get("body") ?? ""));
    checkLength(page.body.label, body, page.body.max);
    patch.body = body === fieldDefault(page.body, site) ? "" : body;
  }

  if (page.seo) {
    patch.seo_title = oneLine(formData.get("seo_title"));
    patch.seo_description = oneLine(formData.get("seo_description"));
    // The share photo is looked up in the library by its address: sizes and blur never come from the browser.
    patch.og_image = await imageFromForm(supabase, formData, "og_image");
    if (!patch.og_image && String(formData.get("og_image") ?? "")) problems.push("The share image isn't in the photo library any more. Choose it again.");
    checkLength("SEO title", patch.seo_title, SEO_TITLE_MAX);
    checkLength("SEO description", patch.seo_description, SEO_DESCRIPTION_MAX);
  }

  if (problems.length > 0) return { status: "error", message: problems.join(" ") };

  // Upsert: the rows come from the content seed, but a missing one is simply created.
  const { error } = await supabase.from("pages").upsert({ key, ...patch }, { onConflict: "key" });
  if (error) return { status: "error", message: `Couldn't save the page: ${error.message}` };

  // One cache entry holds all the pages' words: every page refreshes on its next visit.
  updateTag(TAG.pages);
  notifyIndexNow([page.path]);
  redirect(`${routes.dashboardSection("pages")}?saved=${encodeURIComponent(page.label)}`);
}
