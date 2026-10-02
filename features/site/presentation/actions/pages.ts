"use server";

import { updateTag } from "next/cache";
import { TAG } from "@/lib/cache/tags";
import { notifyIndexNow } from "@/lib/seo/indexnow";
import type { PageRow } from "@/lib/supabase/types";
import { requireAdminAction } from "@/features/dashboard/data/auth";
import { image } from "@/features/dashboard/data/form";
import type { ActionState } from "@/features/dashboard/presentation/components/form-controls";
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

const oneLine = (value: FormDataEntryValue | null) => String(value ?? "").replace(/\s+/g, " ").trim();

/**
 * Saves a fixed page's words and search settings (dashboard → Pages → a page). A field left
 * as its default is stored as "" ("use the default"), so it keeps following the code.
 */
export async function savePage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdminAction();
  const key = String(formData.get("key") ?? "");
  if (!isPageKey(key)) return { status: "error", message: "Unknown page." };
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
    patch.og_image = image(formData, "og_image");
    checkLength("Search title", patch.seo_title, SEO_TITLE_MAX);
    checkLength("Search description", patch.seo_description, SEO_DESCRIPTION_MAX);
  }

  if (problems.length > 0) return { status: "error", message: problems.join(" ") };

  // Upsert: the eight rows come from the content seed, but a missing one is simply created.
  const { error } = await supabase.from("pages").upsert({ key, ...patch }, { onConflict: "key" });
  if (error) return { status: "error", message: `Couldn't save: ${error.message}` };

  // One cache entry holds all the pages' words: every page refreshes on its next visit.
  updateTag(TAG.pages);
  notifyIndexNow([page.path]);
  return { status: "success", message: "Saved. The page shows it on the next visit." };
}
