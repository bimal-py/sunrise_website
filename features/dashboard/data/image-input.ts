import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, MediaRow } from "@/lib/supabase/types";
import type { ImageAsset } from "@/shared/domain/image";

/**
 * Reading photo fields on the server without trusting the browser: the JSON an ImageUrlField
 * or ImageGalleryField sends only says WHICH library photo was chosen (its src); its sizes,
 * blur and share image are read back from the media library. A src that isn't in the library
 * is dropped.
 */

/** A gallery photo as stored: the photo plus its description. */
export type GalleryImage = ImageAsset & { alt: string };

type Db = SupabaseClient<Database>;
type Row = Pick<MediaRow, "src" | "og_src" | "width" | "height" | "blur_data_url">;
const COLUMNS = "src, og_src, width, height, blur_data_url";

function toAsset(row: Row): ImageAsset {
  return { src: row.src, width: row.width, height: row.height, blurDataURL: row.blur_data_url, ogImage: row.og_src };
}

function srcOf(value: unknown): string | null {
  const src = value && typeof value === "object" ? (value as { src?: unknown }).src : null;
  return typeof src === "string" && src.length > 0 && src.length <= 500 ? src : null;
}

/** One photo field (`key`): the library photo it names, or null when it's empty or not a library photo. */
export async function imageFromForm(db: Db, formData: FormData, key: string): Promise<ImageAsset | null> {
  const text = String(formData.get(key) ?? "");
  if (!text) return null;
  let src: string | null;
  try {
    src = srcOf(JSON.parse(text));
  } catch {
    return null;
  }
  if (!src) return null;
  const { data } = await db.from("media").select(COLUMNS).eq("src", src).maybeSingle();
  return data ? toAsset(data) : null;
}

/**
 * A gallery field (`key`): its photos in the order sent, each with its description (300
 * characters at most), duplicates and non-library photos left out, at most `max`.
 */
export async function galleryFromForm(db: Db, formData: FormData, key: string, max = 12): Promise<GalleryImage[]> {
  let items: unknown;
  try {
    items = JSON.parse(String(formData.get(key) ?? "") || "[]");
  } catch {
    return [];
  }
  if (!Array.isArray(items)) return [];
  const wanted: { src: string; alt: string }[] = [];
  for (const item of items.slice(0, 100)) {
    const src = srcOf(item);
    if (!src || wanted.some((entry) => entry.src === src)) continue;
    const alt = (item as { alt?: unknown }).alt;
    wanted.push({ src, alt: typeof alt === "string" ? alt.trim().slice(0, 300) : "" });
    if (wanted.length >= max) break;
  }
  if (wanted.length === 0) return [];
  const { data } = await db
    .from("media")
    .select(COLUMNS)
    .in(
      "src",
      wanted.map((entry) => entry.src),
    );
  const rows = new Map(((data ?? []) as Row[]).map((row) => [row.src, row]));
  return wanted.flatMap(({ src, alt }) => {
    const row = rows.get(src);
    return row ? [{ ...toAsset(row), alt }] : [];
  });
}
