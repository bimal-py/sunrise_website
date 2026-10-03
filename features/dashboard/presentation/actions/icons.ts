"use server";

import { requireAdminAction } from "@/features/dashboard/data/auth";
import { resolveIconSvg } from "@/lib/icons/iconify";

export type IconPreviewResult = { ok: true; svg: string; source: string } | { ok: false; error: string };

/**
 * For the icon field (IconPickerField): fetches and cleans what was picked or pasted, so the
 * field shows exactly what will be saved, or why it can't be. Nothing is stored here: the
 * form's own action resolves the source again on save (never trusting markup from the browser).
 */
export async function previewIcon(source: string): Promise<IconPreviewResult> {
  try {
    await requireAdminAction();
    if (typeof source !== "string") return { ok: false, error: "Pick an icon first." };
    const { svg, source: tidy } = await resolveIconSvg(source);
    return { ok: true, svg, source: tidy };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Couldn't use that icon." };
  }
}
