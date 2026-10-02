import { browserSupabase } from "@/lib/supabase/client";
import { supabaseUrl } from "@/lib/supabase/env";
import {
  joinPath,
  PLACEHOLDER,
  safeFileName,
  SHARE_FOLDER,
  STANDARD_WIDTHS,
  type BucketId,
  type FileEntry,
  type FolderEntry,
  type Listing,
  type Picture,
} from "@/features/file-manager/domain/entities";

/**
 * Storage calls from the browser, as the signed-in admin (row level security on
 * storage.objects lets admins list, upload and delete in both buckets). Uploads go
 * straight to Storage, so a 25 MB file never passes through a server action's 4.5 MB cap.
 * Client components only.
 */

const YEAR = "31536000";

let client: ReturnType<typeof browserSupabase> | null = null;
function bucketApi(bucket: BucketId) {
  client ??= browserSupabase();
  return client.storage.from(bucket);
}

/** Public URL of an object (both buckets are public), the same form lib/media/process-image.ts stores. */
export function publicUrl(bucket: BucketId, path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** Every link a picture has. `site` is the logical src the site's photo fields store (lib/image-loader.ts picks a size from it). */
export function pictureLinks(picture: Picture) {
  const widths = picture.widths.length > 0 ? picture.widths : STANDARD_WIDTHS;
  const size = (width: number) => publicUrl("media", `${picture.collection}/${picture.name}-${width}.webp`);
  const atLeast = (target: number) => widths.find((width) => width >= target) ?? widths[widths.length - 1];
  const fullWidth = widths.includes(1280) ? 1280 : widths[widths.length - 1];
  const share = publicUrl("media", `${picture.collection}/${SHARE_FOLDER}/${picture.name}.jpg`);
  const shareView = picture.view === "share";
  return {
    site: publicUrl("media", `${picture.collection}/${picture.name}.webp`),
    full: size(fullWidth),
    fullWidth,
    share,
    size,
    thumb: shareView ? share : size(atLeast(480)),
    preview: shareView ? share : size(atLeast(800)),
    open: shareView ? share : size(fullWidth),
  };
}

/** One page of a folder: subfolders (entries without an id) and files, the placeholder hidden. */
export async function listFolder(bucket: BucketId, prefix: string, offset: number, limit: number): Promise<Listing> {
  const { data, error } = await bucketApi(bucket).list(prefix, { limit, offset, sortBy: { column: "name", order: "asc" } });
  if (error) throw new Error(error.message);
  const folders: FolderEntry[] = [];
  const files: FileEntry[] = [];
  let placeholder = false;
  for (const item of data) {
    if (item.name === PLACEHOLDER) {
      placeholder = true;
      continue;
    }
    const path = joinPath(prefix, item.name);
    if (!item.id) {
      folders.push({ name: item.name, path });
      continue;
    }
    files.push({
      name: item.name,
      path,
      size: item.metadata?.size ?? 0,
      type: item.metadata?.mimetype ?? "",
      updatedAt: item.updated_at ?? item.created_at,
      url: publicUrl(bucket, path),
    });
  }
  return { folders, files, rawCount: data.length, hasMore: data.length === limit, placeholder };
}

type UploadError = { message: string; statusCode?: string; code?: string };

/** Storage answers a taken name with statusCode "409" / code "KeyAlreadyExists" ("The resource already exists"). */
function isDuplicate(error: UploadError): boolean {
  return error.statusCode === "409" || error.code === "KeyAlreadyExists" || /already exists|duplicate/i.test(error.message);
}

function friendly(error: UploadError): string {
  if (error.statusCode === "413" || /too large|exceeded the maximum/i.test(error.message)) return "it's over the 25 MB limit.";
  if (/mime type/i.test(error.message)) return "that kind of file isn't allowed here.";
  return error.message;
}

function randomHex(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(3)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Uploads one file into a Files folder under a tidy name ("Price List.PDF" → "price-list.pdf").
 * Files are cached for a year and never overwritten: a taken name gets "-<6 hex>" added.
 */
export async function uploadFile(prefix: string, file: File): Promise<FileEntry> {
  const { base, ext } = safeFileName(file.name);
  const attempt = async (name: string) => {
    const path = joinPath(prefix, name);
    const { error } = await bucketApi("files").upload(path, file, { upsert: false, cacheControl: YEAR });
    return { name, path, error };
  };
  let result = await attempt(`${base}${ext}`);
  if (result.error && isDuplicate(result.error)) result = await attempt(`${base}-${randomHex()}${ext}`);
  if (result.error) throw new Error(friendly(result.error));
  return { name: result.name, path: result.path, size: file.size, type: file.type, updatedAt: new Date().toISOString(), url: publicUrl("files", result.path) };
}

/** Deletes objects. Storage answers "nothing deleted" rather than an error when access is refused, so that's checked too. */
export async function removeObjects(bucket: BucketId, paths: string[]): Promise<void> {
  const { data, error } = await bucketApi(bucket).remove(paths);
  if (error) throw new Error(error.message);
  if (data.length === 0) throw new Error("nothing was deleted. Reload the page (you may need to sign in again) and try once more.");
}

/** A new, empty folder in Files: Storage folders exist through their objects, so it gets a zero-byte placeholder. */
export async function createFolder(prefix: string, name: string): Promise<string> {
  const path = joinPath(prefix, name);
  const { error } = await bucketApi("files").upload(joinPath(path, PLACEHOLDER), new Blob([]), { upsert: false, cacheControl: "3600" });
  if (error && !isDuplicate(error)) throw new Error(error.message);
  return path;
}
