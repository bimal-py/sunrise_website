"use server";

import { requireAdminAction } from "@/features/dashboard/data/auth";
import { MEDIA_COLLECTIONS, processImage, uniqueImageName, type MediaCollection } from "@/lib/media/process-image";
import type { ImageAsset } from "@/shared/domain/image";

export type UploadResult = { ok: true; image: ImageAsset } | { ok: false; error: string };

const TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 4_400_000; // Vercel caps a request at 4.5 MB; the browser shrinks big photos first.

/** Upload one photo from an image field: builds its sizes and returns it for the form to save. */
export async function uploadImage(formData: FormData): Promise<UploadResult> {
  try {
    const { supabase } = await requireAdminAction();
    const file = formData.get("file");
    const collection = String(formData.get("collection") ?? "") as MediaCollection;
    if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a photo first." };
    if (!MEDIA_COLLECTIONS.includes(collection)) return { ok: false, error: "Unknown image folder." };
    if (!TYPES.includes(file.type)) return { ok: false, error: "Use a JPEG, PNG, WebP or AVIF photo (iPhone HEIC photos: export as JPEG first)." };
    if (file.size > MAX_BYTES) return { ok: false, error: "That photo is too large. Try a smaller copy (under 4 MB)." };

    const { src, width, height, blurDataURL, ogImage } = await processImage(supabase, Buffer.from(await file.arrayBuffer()), {
      collection,
      name: uniqueImageName(file.name),
      alt: String(formData.get("alt") ?? "").slice(0, 300),
    });
    return { ok: true, image: { src, width, height, blurDataURL, ogImage } };
  } catch (error) {
    console.error("[upload]", error);
    return { ok: false, error: error instanceof Error ? error.message : "Upload failed." };
  }
}
