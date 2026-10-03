import "server-only";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";
import { slugify } from "@/lib/utils/slug";
import type { ImageAsset } from "@/shared/domain/image";

/** Widths the image loader picks from (keep in sync with lib/image-loader.ts and next.config.ts). */
export const IMAGE_WIDTHS = [480, 800, 1280] as const;
/**
 * Product photos also get "<name>-1920.webp" for the zoom on the product page, when the photo
 * is wider than 1280px (so it exists exactly when `collection === "products" && width > 1280`).
 * The image loader never picks it; the zoom asks for it by name.
 */
export const ZOOM_WIDTH = 1920;
export const MEDIA_BUCKET = "media";
export const MEDIA_COLLECTIONS = ["blog", "films", "founder", "site", "pages", "offerings", "products"] as const;
export type MediaCollection = (typeof MEDIA_COLLECTIONS)[number];

const YEAR = "31536000";
/** A decoded photo bigger than this (in pixels) is refused rather than risking the server's memory. */
const MAX_INPUT_PIXELS = 70_000_000;
/**
 * Storage answers `X-Robots-Tag: none` for every file unless the upload sets one, which keeps
 * photos out of Google Images. Files are cached for a year, so it has to be right at upload.
 */
export const INDEXABLE = { "x-robots-tag": "all" } as const;

/** The sizes a processed photo has (see ZOOM_WIDTH). */
export function pictureWidths(collection: string, width: number): number[] {
  return collection === "products" && width > IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1] ? [...IMAGE_WIDTHS, ZOOM_WIDTH] : [...IMAGE_WIDTHS];
}

export function storagePublicUrl(path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;
}

/** "Bride & groom.JPG" → "bride-groom-k3j9x2": readable, and never the same name twice (files are cached for a year). */
export function uniqueImageName(fileName: string): string {
  const base = slugify(fileName.replace(/\.[^.]+$/, "")).slice(0, 60) || "photo";
  return `${base}-${randomBytes(3).toString("hex")}`;
}

/**
 * Builds what the site needs from one photo, the same way scripts/optimize-images.py does
 * for files in /public: 480/800/1280px WebP (never upscaled; products also 1920px for the
 * zoom), a 1200×630 JPEG for link previews and a 16px blur placeholder. Uploads them to
 * Storage (as the signed-in admin; never over an existing file, indexable by search engines)
 * and records the picture in the media library.
 */
export async function processImage(
  db: SupabaseClient<Database>,
  input: Buffer,
  { collection, name, alt = "", trimBars = false }: { collection: MediaCollection; name: string; alt?: string; trimBars?: boolean },
): Promise<ImageAsset & { mediaId: string }> {
  // Respect the camera's orientation; optionally cut black letterbox bars (YouTube thumbnails).
  let image = sharp(input, { failOn: "error", limitInputPixels: MAX_INPUT_PIXELS }).rotate();
  if (trimBars) image = sharp(await image.trim({ background: "#000000", threshold: 28 }).toBuffer());
  const source = await image.toBuffer({ resolveWithObject: true });
  const { width, height } = source.info;
  const base = sharp(source.data);

  const files: { path: string; body: Buffer; type: string }[] = [];
  for (const target of pictureWidths(collection, width)) {
    const body = await base.clone().resize({ width: target, withoutEnlargement: true }).webp({ quality: 76, effort: 6 }).toBuffer();
    files.push({ path: `${collection}/${name}-${target}.webp`, body, type: "image/webp" });
  }
  const og = await base.clone().resize(1200, 630, { fit: "cover", position: "attention" }).jpeg({ quality: 82, progressive: true, mozjpeg: true }).toBuffer();
  files.push({ path: `${collection}/og/${name}.jpg`, body: og, type: "image/jpeg" });
  const blur = await base.clone().resize(16, 16, { fit: "inside" }).webp({ quality: 40 }).toBuffer();

  for (const file of files) {
    const { error } = await db.storage.from(MEDIA_BUCKET).upload(file.path, file.body, { contentType: file.type, cacheControl: YEAR, upsert: false, headers: INDEXABLE });
    if (error) throw new Error(`Upload failed (${file.path}): ${error.message}`);
  }

  const asset: ImageAsset = {
    src: storagePublicUrl(`${collection}/${name}.webp`),
    width,
    height,
    blurDataURL: `data:image/webp;base64,${blur.toString("base64")}`,
    ogImage: storagePublicUrl(`${collection}/og/${name}.jpg`),
  };
  const { data, error } = await db
    .from("media")
    .insert({ collection, name, src: asset.src, og_src: asset.ogImage, width, height, blur_data_url: asset.blurDataURL, alt, bytes: input.length, in_storage: true })
    .select("id")
    .single();
  if (error) throw new Error(`Couldn't record the image: ${error.message}`);
  return { ...asset, mediaId: data.id };
}
