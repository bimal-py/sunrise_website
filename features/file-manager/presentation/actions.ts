"use server";

import { refresh } from "next/cache";
import { requireAdminAction } from "@/features/dashboard/data/auth";
import * as storage from "@/features/file-manager/data/storage.repository";
import {
  cleanPath,
  folderSlug,
  joinPath,
  MAX_FILE_BYTES,
  parentPath,
  plural,
  safeFileName,
  type StorageBucket,
  type StorageListing,
} from "@/features/file-manager/domain/entities";

/**
 * Server actions for the file manager and the file picker. Each one checks for the admin
 * first (actions are public endpoints) and returns its error as a value, so a failure shows
 * as a line in the dialog instead of replacing the page.
 */

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };
export type DeletePictureResult = { ok: true } | { ok: false; error: string };
export type SignedUploadResult = { ok: true; path: string; token: string; signedUrl: string; url: string } | { ok: false; error: string };

function failure(error: unknown, fallback: string): { ok: false; error: string } {
  console.error("[file-manager]", error);
  return { ok: false, error: error instanceof Error && error.message ? error.message : fallback };
}

// ── Reads for the picker (and the manager's "Show more") ─────────────────────────────────────

/** Every bucket, Photos and Files first. */
export async function pickerListBuckets(): Promise<ActionResult<StorageBucket[]>> {
  try {
    await requireAdminAction();
    return { ok: true, data: await storage.listBuckets() };
  } catch (error) {
    return failure(error, "Couldn't list the buckets.");
  }
}

/** One page of a folder (see listEntries in the storage repository). */
export async function pickerListEntries(bucket: string, prefix: string, offset = 0, search = ""): Promise<ActionResult<StorageListing>> {
  try {
    await requireAdminAction();
    if (typeof bucket !== "string" || typeof prefix !== "string") return { ok: false, error: "Pick a bucket first." };
    const listing = await storage.listEntries(bucket, prefix, {
      offset: typeof offset === "number" ? offset : 0,
      search: typeof search === "string" ? search : "",
    });
    return { ok: true, data: listing };
  } catch (error) {
    return failure(error, "Couldn't open that folder.");
  }
}

// ── Uploads ──────────────────────────────────────────────────────────────────────────────────

/**
 * Starts a browser upload of one file: checks it against the guards and the bucket's rules,
 * picks a free, tidy name in `folder` and returns a one-time link for exactly that path (the
 * file then goes from the browser straight to Storage, so the 4.5 MB limit on server actions
 * doesn't apply; Files take up to 25 MB). Photos for the site use uploadImage instead.
 */
export async function createSignedUploadAction(bucket: string, folder: string, fileName: string, size: number, type: string): Promise<SignedUploadResult> {
  try {
    await requireAdminAction();
    if (typeof bucket !== "string" || typeof folder !== "string" || typeof fileName !== "string" || typeof type !== "string") {
      return { ok: false, error: "Something about that file couldn't be read. Try again." };
    }
    const bytes = Number(size);
    if (!Number.isFinite(bytes) || bytes <= 0) return { ok: false, error: "That file is empty." };
    if (bytes > MAX_FILE_BYTES) return { ok: false, error: "That file is over the 25 MB limit." };
    const mime = type.trim().toLowerCase().slice(0, 120);
    if (mime && !/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/.test(mime)) return { ok: false, error: "That kind of file isn't recognised." };
    const found = await storage.checkUpload(bucket, bytes, mime);
    const path = await storage.freeObjectPath(found.name, folder, fileName.slice(0, 200));
    const signed = await storage.createSignedUpload(found.name, path);
    return { ok: true, path: signed.path, token: signed.token, signedUrl: signed.signedUrl, url: storage.publicUrl(found.name, signed.path) };
  } catch (error) {
    return failure(error, "Couldn't start the upload.");
  }
}

// ── Photos ───────────────────────────────────────────────────────────────────────────────────

// The media table's own checks; anything else can't be one of its photos.
const COLLECTION = /^[a-z0-9-]{1,40}$/;
const NAME = /^[A-Za-z0-9_-]{1,120}$/;
/** Every size a photo can have (products also get 1920 for the zoom). */
const STANDARD_WIDTHS = [480, 800, 1280, 1920];

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

// ── The file manager's own reads and changes ─────────────────────────────────────────────────
// Each change refreshes the page it was made from (next/cache refresh(): the dashboard route
// only, no cached public page is touched), so the folder shows the result straight away.

/** Paths handled by one move or delete (the selection's limit). */
const MAX_ITEMS = 200;
/** Media types as Storage takes them: "image/png", "image/*". */
const MIME_RULE = /^[a-z0-9.+-]+\/(\*|[a-z0-9.+-]+)$/;

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Distinct, tidy paths from the browser ("a//b/../c" → "a/b/c"), at most MAX_ITEMS. */
function pathList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const paths = new Set<string>();
  for (const item of value.slice(0, MAX_ITEMS)) {
    if (typeof item !== "string") continue;
    const path = cleanPath(item.slice(0, 1024));
    if (path) paths.add(path);
  }
  return [...paths];
}

function baseName(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

function taken(kind: "folder" | "file", name: string, where = "here"): string {
  return `There's already ${kind === "folder" ? "a folder" : "a file"} called “${name}” ${where}.`;
}

/**
 * One page of a folder for the file manager ("Show more" and search). Unlike the picker's
 * read, `raw` lists a photo folder as Storage has it (every size as its own file), which is
 * how the leftovers of a failed upload are found.
 */
export async function managerListEntries(bucket: string, prefix: string, offset = 0, search = "", raw = false): Promise<ActionResult<StorageListing>> {
  try {
    await requireAdminAction();
    if (typeof bucket !== "string" || typeof prefix !== "string") return { ok: false, error: "Pick a bucket first." };
    const listing = await storage.listEntries(bucket, prefix, {
      offset: typeof offset === "number" ? offset : 0,
      search: typeof search === "string" ? search : "",
      raw: raw === true,
    });
    return { ok: true, data: listing };
  } catch (error) {
    return failure(error, "Couldn't open that folder.");
  }
}

/** Every folder of a bucket, for "Move to…". */
export async function listFolderTreeAction(bucket: string): Promise<ActionResult<{ paths: string[]; complete: boolean }>> {
  try {
    await requireAdminAction();
    return { ok: true, data: await storage.listFolderPaths(text(bucket, 63)) };
  } catch (error) {
    return failure(error, "Couldn't list the folders.");
  }
}

/** A link that opens a file (a signed one, valid for an hour, in a private bucket). */
export async function fileLinkAction(bucket: string, path: string): Promise<ActionResult<string>> {
  try {
    await requireAdminAction();
    return { ok: true, data: await storage.fileLink(text(bucket, 63), text(path, 1024)) };
  } catch (error) {
    return failure(error, "Couldn't make a link to that file.");
  }
}

/** A new, empty folder in `prefix`. Its name is tidied for links ("Price Lists" → "price-lists"). */
export async function createFolderAction(bucket: string, prefix: string, name: string): Promise<ActionResult<{ path: string; name: string }>> {
  try {
    await requireAdminAction();
    const bucketName = text(bucket, 63);
    const parent = cleanPath(text(prefix, 1024));
    const wanted = text(name, 120);
    if (bucketName === "media") return { ok: false, error: "Photo folders are fixed (one per part of the site). Make folders in Files or another bucket." };
    if (!wanted) return { ok: false, error: "Give the folder a name." };
    const slug = folderSlug(wanted);
    if (!slug) return { ok: false, error: "Use latin letters or digits in the name, e.g. price-lists." };
    const existing = await storage.pathKind(bucketName, joinPath(parent, slug));
    if (existing) return { ok: false, error: taken(existing, slug) };
    const path = await storage.createFolder(bucketName, parent, slug);
    refresh();
    return { ok: true, data: { path, name: slug } };
  } catch (error) {
    return failure(error, "Couldn't create the folder.");
  }
}

/**
 * Renames a file or a folder (with everything in it) where it is. Names are tidied for links
 * like uploads are; a file keeps its extension when the new name leaves it out. Never
 * overwrites: a name that's taken is refused.
 */
export async function renameEntryAction(bucket: string, path: string, newName: string): Promise<ActionResult<{ path: string; name: string }>> {
  let started = false;
  try {
    await requireAdminAction();
    const bucketName = text(bucket, 63);
    const source = cleanPath(text(path, 1024));
    const wanted = text(newName, 200);
    if (!source) return { ok: false, error: "Pick what to rename first." };
    if (!wanted) return { ok: false, error: "Give it a name." };
    const kind = await storage.pathKind(bucketName, source);
    if (!kind) return { ok: false, error: "It isn't there any more. Reload and try again." };
    let name: string;
    if (kind === "folder") {
      name = folderSlug(wanted);
      if (!name) return { ok: false, error: "Use latin letters or digits in the name, e.g. price-lists." };
    } else {
      const { base, ext } = safeFileName(wanted);
      name = `${base}${ext || safeFileName(baseName(source)).ext}`;
    }
    const target = joinPath(parentPath(source), name);
    if (target === source) return { ok: true, data: { path: source, name } };
    const existing = await storage.pathKind(bucketName, target);
    if (existing) return { ok: false, error: taken(existing, name) };
    started = true;
    await storage.moveObject(bucketName, source, target);
    refresh();
    return { ok: true, data: { path: target, name } };
  } catch (error) {
    // A folder is renamed file by file; show whatever state it stopped in.
    if (started) refresh();
    return failure(error, "Couldn't rename it.");
  }
}

/** Moves files and folders into `destination` ("" = the top level). Stops at the first name that's taken there. */
export async function moveEntriesAction(bucket: string, paths: string[], destination: string): Promise<ActionResult<{ moved: number }>> {
  let moved = 0;
  let started = false;
  try {
    await requireAdminAction();
    const bucketName = text(bucket, 63);
    const sources = pathList(paths);
    const target = cleanPath(text(destination, 1024));
    if (sources.length === 0) return { ok: false, error: "Pick what to move first." };
    if (target && (await storage.pathKind(bucketName, target)) !== "folder") return { ok: false, error: "That folder isn't there any more. Pick another." };
    const where = target ? `in “${target}”` : "at the top level";
    for (const source of sources) {
      const name = baseName(source);
      const to = joinPath(target, name);
      if (to === source) continue;
      if (target === source || target.startsWith(`${source}/`)) throw new Error(`“${name}” can't go inside itself.`);
      const existing = await storage.pathKind(bucketName, to);
      if (existing) throw new Error(taken(existing, name, where));
      started = true;
      await storage.moveObject(bucketName, source, to);
      moved++;
    }
    if (started) refresh();
    return { ok: true, data: { moved } };
  } catch (error) {
    if (started) refresh();
    const result = failure(error, "Couldn't move them.");
    return moved > 0 ? { ok: false, error: `Moved ${plural(moved, "item")}, then stopped. ${result.error}` } : result;
  }
}

/** Deletes files and folders (with everything in them). Photos go through deletePicturesAction. */
export async function deleteEntriesAction(bucket: string, paths: string[]): Promise<ActionResult<{ removed: number }>> {
  let started = false;
  try {
    await requireAdminAction();
    const bucketName = text(bucket, 63);
    const targets = pathList(paths);
    if (targets.length === 0) return { ok: false, error: "Pick what to delete first." };
    started = true;
    const removed = await storage.removeObjects(bucketName, targets);
    refresh();
    return { ok: true, data: { removed } };
  } catch (error) {
    if (started) refresh();
    return failure(error, "Couldn't delete them.");
  }
}

export type PictureRef = { collection: string; name: string; widths?: number[] };

/**
 * Deletes processed photos, each everywhere (deletePicture: every size, the share image and
 * the library entry). Photos shipped with the site's code (/images) are refused: they aren't
 * in Storage. Goes on past a failure and reports what didn't go.
 */
export async function deletePicturesAction(pictures: PictureRef[]): Promise<ActionResult<{ deleted: number; failed: string[] }>> {
  try {
    const { supabase } = await requireAdminAction();
    if (!Array.isArray(pictures) || pictures.length === 0) return { ok: false, error: "Pick the photos to delete first." };
    const list = pictures
      .slice(0, MAX_ITEMS)
      .filter((item): item is PictureRef => Boolean(item) && typeof item.collection === "string" && typeof item.name === "string" && COLLECTION.test(item.collection) && NAME.test(item.name));
    if (list.length === 0) return { ok: false, error: "Those aren't photos from the media library." };

    const { data: rows, error } = await supabase
      .from("media")
      .select("collection, name, in_storage")
      .in("name", [...new Set(list.map((item) => item.name))]);
    if (error) return { ok: false, error: `Couldn't check the photos: ${error.message}` };
    const shipped = new Set((rows ?? []).filter((row) => !row.in_storage).map((row) => `${row.collection}/${row.name}`));

    let deleted = 0;
    const failed: string[] = [];
    for (const item of list) {
      if (shipped.has(`${item.collection}/${item.name}`)) {
        failed.push(`${item.name}: it ships with the site's code, so it can't be deleted here.`);
        continue;
      }
      const widths = Array.isArray(item.widths) ? item.widths.filter((width) => typeof width === "number") : [];
      const result = await deletePicture(item.collection, item.name, widths);
      if (result.ok) deleted++;
      else failed.push(`${item.name}: ${result.error}`);
    }
    if (deleted > 0) refresh();
    if (deleted === 0) return { ok: false, error: failed.length === 1 ? failed[0] : `Nothing was deleted. ${failed.slice(0, 3).join(" ")}` };
    return { ok: true, data: { deleted, failed } };
  } catch (error) {
    return failure(error, "Couldn't delete the photos.");
  }
}

// ── Buckets ──────────────────────────────────────────────────────────────────────────────────

/** A new bucket (lowercase letters, digits, hyphens or underscores). Private unless `isPublic`. */
export async function createBucketAction(name: string, isPublic: boolean): Promise<ActionResult<StorageBucket>> {
  try {
    await requireAdminAction();
    const bucket = await storage.createBucket(text(name, 63).toLowerCase(), { public: isPublic === true, allowedMimeTypes: null, fileSizeLimit: null });
    refresh();
    return { ok: true, data: bucket };
  } catch (error) {
    return failure(error, "Couldn't create the bucket.");
  }
}

/**
 * A bucket's rules: public or private, the file types it takes ("image/*, application/pdf";
 * blank = any) and the largest file in MB (blank = no limit). Photos and Files stay public.
 */
export async function updateBucketAction(
  name: string,
  settings: { public: boolean; allowedMimeTypes: string; fileSizeLimitMb: string },
): Promise<ActionResult<StorageBucket>> {
  try {
    await requireAdminAction();
    if (!settings || typeof settings !== "object") return { ok: false, error: "The settings couldn't be read. Try again." };
    const types = [...new Set(text(settings.allowedMimeTypes, 2000).toLowerCase().split(/[\s,;]+/).filter(Boolean))];
    const wrong = types.find((type) => !MIME_RULE.test(type));
    if (wrong) return { ok: false, error: `“${wrong}” isn't a file type. Write them like image/png or image/*, separated by commas.` };
    if (types.length > 50) return { ok: false, error: "That's a lot of file types. Use wildcards such as image/* instead." };
    const size = text(settings.fileSizeLimitMb, 20).replace(",", ".");
    let fileSizeLimit: number | null = null;
    if (size) {
      const mb = Number(size);
      if (!Number.isFinite(mb) || mb <= 0) return { ok: false, error: "Write the size limit in MB (for example 25), or leave it blank for no limit." };
      fileSizeLimit = Math.round(mb * 1_048_576);
    }
    const bucket = await storage.updateBucket(text(name, 63), { public: settings.public === true, allowedMimeTypes: types.length > 0 ? types : null, fileSizeLimit });
    refresh();
    return { ok: true, data: bucket };
  } catch (error) {
    return failure(error, "Couldn't save the bucket's settings.");
  }
}

/** Empties a bucket and deletes it. Photos and Files can't be deleted (the repository refuses). */
export async function deleteBucketAction(name: string): Promise<ActionResult<null>> {
  try {
    await requireAdminAction();
    await storage.deleteBucket(text(name, 63));
    refresh();
    return { ok: true, data: null };
  } catch (error) {
    return failure(error, "Couldn't delete the bucket.");
  }
}
