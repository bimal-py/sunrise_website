"use server";

import { requireAdminAction } from "@/features/dashboard/data/auth";

export type DeletePictureResult = { ok: true } | { ok: false; error: string };

// The media table's own checks; anything else can't be one of its photos.
const COLLECTION = /^[a-z0-9-]{1,40}$/;
const NAME = /^[A-Za-z0-9_-]{1,120}$/;
const STANDARD_WIDTHS = [480, 800, 1280];

/**
 * Deletes one processed photo everywhere: each size ("<collection>/<name>-<width>.webp"),
 * its share image ("<collection>/og/<name>.jpg") and its row in the media library.
 * Missing files are skipped, so a half-deleted photo can be cleaned up too.
 * `widths` adds any extra sizes the file manager saw in the folder.
 */
export async function deletePicture(collection: string, name: string, widths: number[] = []): Promise<DeletePictureResult> {
  try {
    const { supabase } = await requireAdminAction();
    if (typeof collection !== "string" || typeof name !== "string" || !COLLECTION.test(collection) || !NAME.test(name)) {
      return { ok: false, error: "That isn't a photo from the media library." };
    }
    const extra = Array.isArray(widths) ? widths.filter((width) => Number.isInteger(width) && width > 0 && width < 10_000).slice(0, 20) : [];
    const paths = [
      ...[...new Set([...STANDARD_WIDTHS, ...extra])].map((width) => `${collection}/${name}-${width}.webp`),
      `${collection}/${name}.webp`,
      `${collection}/og/${name}.jpg`,
    ];

    const { error: storageError } = await supabase.storage.from("media").remove(paths);
    if (storageError) return { ok: false, error: `Couldn't delete the files: ${storageError.message}` };

    // Only rows for uploads: in_storage = false rows are photos shipped with the site (/images/…).
    const { error } = await supabase.from("media").delete().eq("collection", collection).eq("name", name).eq("in_storage", true);
    if (error) return { ok: false, error: `The files are gone, but the library entry wasn't removed: ${error.message}` };
    return { ok: true };
  } catch (error) {
    console.error("[file-manager] delete photo", error);
    return { ok: false, error: error instanceof Error ? error.message : "Couldn't delete the photo." };
  }
}
