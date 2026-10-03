"use server";

import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdminAction } from "@/features/dashboard/data/auth";
import { siteUrl } from "@/lib/config/site";
import { MEDIA_COLLECTIONS, processImage, uniqueImageName, type MediaCollection } from "@/lib/media/process-image";
import { safeFetch, SafeFetchError } from "@/lib/net/safe-fetch";
import { adminClient } from "@/lib/supabase/admin";
import { supabaseUrl } from "@/lib/supabase/env";
import type { Database, MediaRow } from "@/lib/supabase/types";
import type { ImageAsset } from "@/shared/domain/image";

export type UploadResult = { ok: true; image: ImageAsset } | { ok: false; error: string };
/** A photo field's answer to a pasted or picked link: the photo (and its description, if the library has one). */
export type ResolveResult = { ok: true; image: ImageAsset; alt: string } | { ok: false; error: string };

const TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 4_400_000; // Vercel caps a request at 4.5 MB; the browser shrinks big photos first.
/** A photo imported from a link (or from the Files bucket) may be this big. */
const MAX_IMPORT_BYTES = 15_000_000;

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

// ---------------------------------------------------------------------------------------------
// A pasted or picked link → a photo the site can use
// ---------------------------------------------------------------------------------------------

type Db = SupabaseClient<Database>;
const MEDIA_COLUMNS = "src, og_src, width, height, blur_data_url, alt";
const SIZE_SUFFIX = /^(.+)-(480|800|1280|1920)$/;
/** Our Storage links: ".../storage/v1/object/public/<bucket>/<path>" (also sign/authenticated and render/image). */
const OWN_OBJECT = /^\/storage\/v1\/(?:object|render\/image)\/(?:public|sign|authenticated)\/([a-z0-9][a-z0-9_-]{1,62})\/(.+)$/;

function asset(row: Pick<MediaRow, "src" | "og_src" | "width" | "height" | "blur_data_url" | "alt">): ResolveResult {
  return { ok: true, image: { src: row.src, width: row.width, height: row.height, blurDataURL: row.blur_data_url, ogImage: row.og_src }, alt: row.alt };
}

/**
 * The media library's src values a link may stand for, most likely first: a photo's own src,
 * any of its sizes ("-1280.webp") or its share image ("/og/<name>.jpg"), for uploads in Storage
 * and for the photos shipped in /images alike. Empty when it isn't one of ours.
 */
function librarySources(url: URL, relative: boolean): string[] {
  const own = (base: string, collection: string, file: string): string[] => {
    const share = /^og\/([A-Za-z0-9_-]{1,120})\.jpg$/.exec(file);
    if (share) return [`${base}/${collection}/${share[1]}.webp`];
    const sized = /^([A-Za-z0-9_-]{1,120})\.webp$/.exec(file);
    if (!sized) return [];
    const exact = `${base}/${collection}/${sized[1]}.webp`;
    const stripped = SIZE_SUFFIX.exec(sized[1]);
    return stripped ? [exact, `${base}/${collection}/${stripped[1]}.webp`] : [exact];
  };
  if (supabaseUrl && url.origin === new URL(supabaseUrl).origin) {
    const match = /^\/storage\/v1\/(?:object|render\/image)\/(?:public|sign|authenticated)\/media\/([a-z0-9-]{1,40})\/(.+)$/.exec(url.pathname);
    if (match) return own(`${supabaseUrl}/storage/v1/object/public/media`, match[1], decodeURIComponent(match[2]));
  }
  if (relative || url.origin === new URL(siteUrl).origin) {
    const match = /^\/images\/(blog|films)\/(.+)$/.exec(url.pathname);
    if (match) return own("/images", match[1], decodeURIComponent(match[2]));
  }
  return [];
}

async function findInLibrary(db: Db, sources: string[]): Promise<ResolveResult | null> {
  for (const src of sources) {
    const { data } = await db.from("media").select(MEDIA_COLUMNS).eq("src", src).maybeSingle();
    if (data) return asset(data);
  }
  return null;
}

/** A file in one of our own buckets, read through Storage (no web request to ourselves). */
async function readOwnFile(db: Db, bucket: string, path: string): Promise<{ body: Buffer; type: string }> {
  const api = (adminClient() ?? db).storage.from(bucket);
  const { data: info, error: infoError } = await api.info(path);
  if (infoError || !info) throw new Error("That file isn't in the file manager any more.");
  const type = String(info.contentType ?? "").toLowerCase();
  if (type && !type.startsWith("image/")) throw new Error("That file isn't a photo.");
  if ((info.size ?? 0) > MAX_IMPORT_BYTES) throw new Error("That photo is too large to use (over 15 MB).");
  const { data, error } = await api.download(path);
  if (error || !data) throw new Error("Couldn't read that file. Try again.");
  if (data.size > MAX_IMPORT_BYTES) throw new Error("That photo is too large to use (over 15 MB).");
  return { body: Buffer.from(await data.arrayBuffer()), type: type || data.type };
}

/** Refuses what sharp can't (or shouldn't) turn into the site's sizes. */
async function checkPhoto(body: Buffer): Promise<void> {
  let format: string | undefined;
  let compression: string | undefined;
  try {
    const meta = await sharp(body, { limitInputPixels: 70_000_000 }).metadata();
    format = meta.format;
    compression = meta.compression;
  } catch {
    throw new Error("That file isn't a photo that can be read (or it's damaged).");
  }
  if (format === "heif" && compression !== "av1") throw new Error("iPhone HEIC photos can't be read here. Export it as JPEG first.");
  if (!format || !["jpeg", "png", "webp", "gif", "tiff", "heif", "avif"].includes(format)) {
    throw new Error("Use a JPEG, PNG, WebP or AVIF photo.");
  }
}

function fileNameOf(url: URL): string {
  const last = url.pathname.slice(url.pathname.lastIndexOf("/") + 1);
  try {
    return decodeURIComponent(last) || "photo";
  } catch {
    return "photo";
  }
}

/**
 * Turns a link from a photo field into a photo the site can use:
 * - one of ours already (an upload, any of its sizes or its share image, or a photo shipped in
 *   /images) → its entry in the media library, as it is;
 * - a photo in another of our buckets (e.g. Files) → read through Storage and processed;
 * - any other https photo → downloaded safely (lib/net/safe-fetch.ts: public addresses only,
 *   15 MB, image types) and processed.
 * Processing builds the usual sizes into `collection` under a new name (lib/media/process-image.ts).
 */
export async function resolveImageUrl(url: string, collection: MediaCollection): Promise<ResolveResult> {
  try {
    const { supabase } = await requireAdminAction();
    if (typeof url !== "string" || typeof collection !== "string") return { ok: false, error: "Paste a link to a photo first." };
    if (!MEDIA_COLLECTIONS.includes(collection)) return { ok: false, error: "Unknown image folder." };
    const input = url.trim().slice(0, 2000);
    if (!input) return { ok: false, error: "Paste a link to a photo first." };

    const relative = input.startsWith("/") && !input.startsWith("//");
    let parsed: URL;
    try {
      parsed = relative ? new URL(input, siteUrl) : new URL(input);
    } catch {
      return { ok: false, error: "That doesn't look like a link. Paste the photo's full address (https://…)." };
    }

    const sources = librarySources(parsed, relative);
    if (sources.length > 0) {
      const found = await findInLibrary(supabase, sources);
      return found ?? { ok: false, error: "That photo isn't in the media library (any more). Pick another one, or upload it again." };
    }

    let body: Buffer;
    const own = supabaseUrl && parsed.origin === new URL(supabaseUrl).origin ? OWN_OBJECT.exec(parsed.pathname) : null;
    if (own) {
      ({ body } = await readOwnFile(supabase, own[1], decodeURIComponent(own[2])));
    } else if (relative) {
      return { ok: false, error: "That isn't a photo from this site. Pick one from the library, or paste its full address." };
    } else {
      try {
        ({ body } = await safeFetch(parsed.toString(), { maxBytes: MAX_IMPORT_BYTES, timeoutMs: 15_000, accept: /^image\//, acceptHeader: "image/*" }));
      } catch (error) {
        if (error instanceof SafeFetchError && error.contentType?.startsWith("text/html")) {
          return { ok: false, error: "That link is a web page, not a photo. Open the photo itself and copy its address." };
        }
        throw error;
      }
    }
    await checkPhoto(body);
    const { src, width, height, blurDataURL, ogImage } = await processImage(supabase, body, { collection, name: uniqueImageName(fileNameOf(parsed)) });
    return { ok: true, image: { src, width, height, blurDataURL, ogImage }, alt: "" };
  } catch (error) {
    console.error("[resolve image]", error);
    return { ok: false, error: error instanceof Error ? error.message : "Couldn't use that photo." };
  }
}
