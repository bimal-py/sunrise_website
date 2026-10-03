import type { MediaCollection } from "@/lib/media/process-image";
import { uploadImage, type UploadResult } from "../../actions/media";

/**
 * Photo uploads from the browser (client components only): shrink big camera photos first
 * (faster on mobile data, and under the 4.5 MB request limit), then uploadImage builds the
 * site's sizes on the server.
 */

/** Photo types uploadImage accepts. */
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
/** For <input type="file" accept>. */
export const PHOTO_ACCEPT = PHOTO_TYPES.join(",");
/** uploadImage's limit (a server action request is capped at 4.5 MB). */
export const MAX_PHOTO_BYTES = 4_400_000;

const MAX_SIDE = 2560;

/** Big photos are redrawn at most 2560px on the long side as a JPEG; small ones go as they are. */
export async function preparePhoto(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 3_500_000) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", 0.9));
}

/** Why a file can't be uploaded as a photo, or null if it can. */
export function photoProblem(file: File): string | null {
  if (/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)) return "iPhone HEIC photos can't be read here. Export it as JPEG first.";
  if (!PHOTO_TYPES.includes(file.type)) return "Use a JPEG, PNG, WebP or AVIF photo.";
  return null;
}

/** Shrinks and uploads one photo into a media collection. Never throws. */
export async function uploadPhoto(file: File, collection: MediaCollection, alt = ""): Promise<UploadResult> {
  const problem = photoProblem(file);
  if (problem) return { ok: false, error: problem };
  try {
    const blob = await preparePhoto(file);
    if (blob.size > MAX_PHOTO_BYTES) return { ok: false, error: "That photo is too large, even shrunk. Try a smaller copy (under 4 MB)." };
    const body = new FormData();
    body.set("file", blob, blob === file ? file.name : `${file.name.replace(/\.[^.]+$/, "")}.jpg`);
    body.set("collection", collection);
    if (alt) body.set("alt", alt.slice(0, 300));
    return await uploadImage(body);
  } catch {
    return { ok: false, error: "Upload failed. Check your connection and try again." };
  }
}

/** The image files among dropped or pasted files. */
export function imageFiles(list: FileList | File[] | null | undefined): File[] {
  return Array.from(list ?? []).filter((file) => file.type.startsWith("image/") || /\.(heic|heif)$/i.test(file.name));
}
