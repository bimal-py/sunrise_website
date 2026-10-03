import "server-only";
import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { INDEXABLE, MEDIA_BUCKET, MEDIA_COLLECTIONS, pictureWidths } from "@/lib/media/process-image";
import { adminClient } from "@/lib/supabase/admin";
import { supabaseUrl } from "@/lib/supabase/env";
import type { Database, MediaRow } from "@/lib/supabase/types";
import {
  BUCKET_NAME,
  cleanPath,
  fileKind,
  folderSlug,
  isProtectedBucket,
  joinPath,
  PAGE_SIZE,
  PHOTO_FOLDERS,
  pictureUrl,
  PLACEHOLDER,
  safeFileName,
  typeAllowed,
  type StorageBucket,
  type StorageFile,
  type StorageFolder,
  type StorageListing,
  type StoragePicture,
} from "../domain/entities";

/**
 * Supabase Storage for the file manager and the file picker, with the secret key (bucket
 * management needs it, and buckets made here have no row level security policies). Server
 * only, and every function trusts its caller to have checked for the admin first (the server
 * actions call requireAdminAction()). Errors are thrown with messages for the owner.
 *
 * Guards: "media" (processed photos, referenced by src all over the site) is read through the
 * media library and changed only by the photo uploader and deletePicture; "media" and "files"
 * can't be deleted or made private. Uploads never overwrite (a taken name gets "-<6 hex>"),
 * are cached for a year and are indexable.
 */

const YEAR = "31536000";
/** Objects handled by one folder delete or move. */
const MAX_BATCH = 10_000;
const LIST_PAGE = 1000;
const LABELS: Record<string, string> = { media: "Photos", files: "Files" };
const PHOTOS_ONLY = "Photos are changed through the photo uploader and their own Delete, so the site's links to them keep working.";

type Db = SupabaseClient<Database>;
type StorageError = { message: string; statusCode?: string; status?: number; code?: string; error?: string };

function client(): Db {
  const db = adminClient();
  if (!db) throw new Error("Managing files needs the server's secret key (SUPABASE_SERVICE_ROLE_KEY) in the hosting settings.");
  return db;
}

function isDuplicate(error: StorageError): boolean {
  return error.statusCode === "409" || error.status === 409 || error.code === "KeyAlreadyExists" || error.error === "Duplicate" || /already exists|duplicate/i.test(error.message);
}

function friendly(error: StorageError, what: string): Error {
  if (error.statusCode === "413" || /too large|exceeded the maximum/i.test(error.message)) return new Error(`${what}: the file is over the bucket's size limit.`);
  if (/mime type/i.test(error.message)) return new Error(`${what}: that kind of file isn't allowed in this bucket.`);
  if (/not found/i.test(error.message)) return new Error(`${what}: it isn't there any more. Reload and try again.`);
  return new Error(`${what}: ${error.message}`);
}

function hex(): string {
  return randomBytes(3).toString("hex");
}

/** Public link of an object, the same form the browser helpers and lib/media/process-image.ts build. */
export function publicUrl(bucket: string, path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

type BucketRow = { id: string; name: string; public: boolean; created_at?: string | null; allowed_mime_types?: string[] | null; file_size_limit?: number | string | null };

function toBucket(row: BucketRow): StorageBucket {
  const limit = typeof row.file_size_limit === "number" ? row.file_size_limit : Number(row.file_size_limit);
  return {
    id: row.id,
    name: row.name,
    label: LABELS[row.name] ?? row.name,
    public: row.public,
    protected: isProtectedBucket(row.name),
    createdAt: row.created_at ?? null,
    allowedMimeTypes: row.allowed_mime_types && row.allowed_mime_types.length > 0 ? row.allowed_mime_types : null,
    fileSizeLimit: Number.isFinite(limit) && limit > 0 ? limit : null,
  };
}

const ORDER = ["media", "files"];

/** Every bucket: Photos and Files first, then the others A→Z. */
export async function listBuckets(): Promise<StorageBucket[]> {
  const { data, error } = await client().storage.listBuckets();
  if (error) throw new Error(`Couldn't list the buckets: ${error.message}`);
  return (data as BucketRow[]).map(toBucket).sort((a, b) => {
    const rank = (name: string) => (ORDER.includes(name) ? ORDER.indexOf(name) : ORDER.length);
    return rank(a.name) - rank(b.name) || a.name.localeCompare(b.name);
  });
}

export async function getBucket(name: string): Promise<StorageBucket | null> {
  if (typeof name !== "string" || !BUCKET_NAME.test(name)) return null;
  const { data, error } = await client().storage.getBucket(name);
  if (error || !data) return null;
  return toBucket(data as BucketRow);
}

async function requireBucket(name: string): Promise<StorageBucket> {
  const bucket = await getBucket(name);
  if (!bucket) throw new Error("That bucket doesn't exist (any more). Reload and pick another.");
  return bucket;
}

// ---------------------------------------------------------------------------------------------
// Listing
// ---------------------------------------------------------------------------------------------

const MEDIA_COLUMNS = "id, collection, name, src, og_src, width, height, blur_data_url, alt, bytes, in_storage, created_at";

function toPicture(row: MediaRow): StoragePicture {
  return {
    type: "picture",
    id: row.id,
    collection: row.collection,
    name: row.name,
    path: `${row.collection}/${row.name}`,
    image: { src: row.src, width: row.width, height: row.height, blurDataURL: row.blur_data_url, ogImage: row.og_src },
    alt: row.alt,
    inStorage: row.in_storage,
    bytes: row.bytes,
    createdAt: row.created_at,
    // Photos shipped in /images have the three standard sizes (scripts/optimize-images.py).
    widths: row.in_storage ? pictureWidths(row.collection, row.width) : [480, 800, 1280],
    thumbUrl: pictureUrl(row.src, 480),
    fullUrl: pictureUrl(row.src, 1280),
  };
}

/** Letters, digits, spaces and hyphens only, so a search can't change the query's meaning. */
function searchTerm(search: string): string {
  return search
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim()
    .replace(/\s+/g, "%")
    .slice(0, 60);
}

function photoFolder(name: string): StorageFolder {
  return { type: "folder", name, path: name, description: (PHOTO_FOLDERS as Record<string, string>)[name] };
}

/** The media bucket's top level: one folder per collection (the known ones first), or photos matching a search across all of them. */
async function mediaTop(search: string, offset: number, limit: number): Promise<StorageListing> {
  const db = client();
  const { data } = await db.storage.from(MEDIA_BUCKET).list("", { limit: LIST_PAGE, sortBy: { column: "name", order: "asc" } });
  const extra = (data ?? []).filter((item) => !item.id && !(MEDIA_COLLECTIONS as readonly string[]).includes(item.name)).map((item) => item.name);
  const term = searchTerm(search);
  let folders = [...MEDIA_COLLECTIONS, ...extra].map(photoFolder);
  if (!term) return { bucket: MEDIA_BUCKET, prefix: "", folders, files: [], pictures: [], nextOffset: null, placeholder: false };
  folders = offset === 0 ? folders.filter((folder) => folder.name.includes(term.replace(/%/g, " "))) : [];
  const { data: rows, error } = await db
    .from("media")
    .select(MEDIA_COLUMNS)
    .or(`name.ilike.%${term}%,alt.ilike.%${term}%`)
    .order("created_at", { ascending: false })
    .order("id")
    .range(offset, offset + limit - 1);
  if (error) throw new Error(`Couldn't search the photos: ${error.message}`);
  const pictures = (rows as MediaRow[]).map(toPicture);
  return { bucket: MEDIA_BUCKET, prefix: "", folders, files: [], pictures, nextOffset: pictures.length === limit ? offset + limit : null, placeholder: false };
}

/** One collection's photos from the media library, newest first (shipped photos included). */
async function mediaCollection(collection: string, search: string, offset: number, limit: number): Promise<StorageListing> {
  let query = client().from("media").select(MEDIA_COLUMNS).eq("collection", collection);
  const term = searchTerm(search);
  if (term) query = query.or(`name.ilike.%${term}%,alt.ilike.%${term}%`);
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id")
    .range(offset, offset + limit - 1);
  if (error) throw new Error(`Couldn't list the photos: ${error.message}`);
  const pictures = (data as MediaRow[]).map(toPicture);
  return { bucket: MEDIA_BUCKET, prefix: collection, folders: [], files: [], pictures, nextOffset: pictures.length === limit ? offset + limit : null, placeholder: false };
}

type ListedObject = { name: string; id: string | null; updated_at?: string | null; created_at?: string | null; metadata?: Record<string, unknown> | null };

function toEntries(bucket: string, prefix: string, items: ListedObject[]) {
  const folders: StorageFolder[] = [];
  const files: StorageFile[] = [];
  let placeholder = false;
  for (const item of items) {
    if (item.name === PLACEHOLDER) {
      placeholder = true;
      continue;
    }
    const path = joinPath(prefix, item.name);
    if (!item.id) {
      folders.push({ type: "folder", name: item.name, path });
      continue;
    }
    const size = Number(item.metadata?.size ?? 0);
    const mimeType = typeof item.metadata?.mimetype === "string" ? item.metadata.mimetype : null;
    files.push({
      type: "file",
      name: item.name,
      path,
      size: Number.isFinite(size) ? size : 0,
      mimeType,
      updatedAt: item.updated_at ?? item.created_at ?? null,
      publicUrl: publicUrl(bucket, path),
      kind: fileKind({ type: mimeType ?? "", name: item.name }),
    });
  }
  return { folders, files, placeholder };
}

/** A folder of any other bucket (or a deeper media folder), straight from Storage. */
async function storageFolder(bucket: string, prefix: string, search: string, offset: number, limit: number): Promise<StorageListing> {
  const api = client().storage.from(bucket);
  const query = search.trim().toLowerCase();
  if (query) {
    // Storage only searches by how names start; this finds a word anywhere in the folder's first thousand names.
    const { data, error } = await api.list(prefix, { limit: LIST_PAGE, offset: 0, sortBy: { column: "name", order: "asc" } });
    if (error) throw friendly(error, "Couldn't search the folder");
    const matches = (data as ListedObject[]).filter((item) => item.name !== PLACEHOLDER && item.name.toLowerCase().includes(query));
    const page = matches.slice(offset, offset + limit);
    return { bucket, prefix, ...toEntries(bucket, prefix, page), pictures: [], nextOffset: offset + limit < matches.length ? offset + limit : null };
  }
  const { data, error } = await api.list(prefix, { limit, offset, sortBy: { column: "name", order: "asc" } });
  if (error) throw friendly(error, "Couldn't open the folder");
  const items = data as ListedObject[];
  return { bucket, prefix, ...toEntries(bucket, prefix, items), pictures: [], nextOffset: items.length === limit ? offset + items.length : null };
}

/**
 * One page of a folder. In "media" the top level shows one folder per collection and a
 * collection shows its photos from the media library (sizes grouped, blur and share image
 * included), newest first; everywhere else it's the Storage folder: subfolders and files A→Z.
 * `search` filters by name (and, for photos, description). `raw` lists a media folder as
 * Storage has it instead (every size as its own file; e.g. to find leftovers of a failed
 * upload, which deletePicture can remove by collection and name).
 */
export async function listEntries(
  bucket: string,
  prefix: string,
  { offset = 0, limit = PAGE_SIZE, search = "", raw = false }: { offset?: number; limit?: number; search?: string; raw?: boolean } = {},
): Promise<StorageListing> {
  const found = await requireBucket(bucket);
  const path = cleanPath(String(prefix ?? ""));
  const start = Math.max(0, Math.floor(Number(offset)) || 0);
  const size = Math.min(Math.max(1, Math.floor(Number(limit)) || PAGE_SIZE), 200);
  const query = String(search ?? "").slice(0, 100);
  if (found.name === MEDIA_BUCKET && !raw) {
    if (!path) return mediaTop(query, start, size);
    if (!path.includes("/") && /^[a-z0-9-]{1,40}$/.test(path)) return mediaCollection(path, query, start, size);
  }
  return storageFolder(found.name, path, query, start, size);
}

// ---------------------------------------------------------------------------------------------
// Uploading
// ---------------------------------------------------------------------------------------------

async function exists(db: Db, bucket: string, path: string): Promise<boolean> {
  const { data } = await db.storage.from(bucket).exists(path);
  return data === true;
}

/** A free path for `fileName` in `folder`: "Price List.PDF" → "price-list.pdf", or "price-list-3fa9c1.pdf" if that's taken. */
export async function freeObjectPath(bucket: string, folder: string, fileName: string): Promise<string> {
  const db = client();
  const { base, ext } = safeFileName(fileName);
  const dir = cleanPath(folder);
  const first = joinPath(dir, `${base}${ext}`);
  if (!(await exists(db, bucket, first))) return first;
  return joinPath(dir, `${base}-${hex()}${ext}`);
}

/** Checks an upload against the guards and the bucket's own rules; returns the bucket. */
export async function checkUpload(bucketName: string, size: number, type: string): Promise<StorageBucket> {
  const bucket = await requireBucket(bucketName);
  if (bucket.name === MEDIA_BUCKET) throw new Error("Photos go in through the photo uploader, which builds their sizes. Use Upload in a photo folder.");
  if (!Number.isFinite(size) || size <= 0) throw new Error("That file is empty.");
  if (bucket.fileSizeLimit && size > bucket.fileSizeLimit) throw new Error(`That file is over this bucket's limit (${Math.round(bucket.fileSizeLimit / 1_048_576)} MB).`);
  if (!typeAllowed(bucket.allowedMimeTypes, type || "application/octet-stream")) throw new Error("That kind of file isn't allowed in this bucket.");
  return bucket;
}

/**
 * A one-time link the browser uploads one file to directly (big files never pass through a
 * server action's 4.5 MB limit). Valid for two hours, for this path only, never overwriting.
 */
export async function createSignedUpload(bucket: string, path: string): Promise<{ path: string; token: string; signedUrl: string }> {
  const { data, error } = await client().storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) throw friendly(error ?? { message: "no link was returned" }, "Couldn't start the upload");
  return { path: data.path, token: data.token, signedUrl: data.signedUrl };
}

/** Uploads a file from the server (small ones only: the body came through a server action or a fetch). */
export async function uploadServerFile(bucket: string, folder: string, fileName: string, body: Buffer | Blob, contentType: string): Promise<StorageFile> {
  const size = body instanceof Blob ? body.size : body.length;
  await checkUpload(bucket, size, contentType);
  const db = client();
  const attempt = async (path: string) => db.storage.from(bucket).upload(path, body, { contentType: contentType || "application/octet-stream", cacheControl: YEAR, upsert: false, headers: INDEXABLE });
  let path = await freeObjectPath(bucket, folder, fileName);
  let { error } = await attempt(path);
  if (error && isDuplicate(error)) {
    const { base, ext } = safeFileName(fileName);
    path = joinPath(cleanPath(folder), `${base}-${hex()}${ext}`);
    ({ error } = await attempt(path));
  }
  if (error) throw friendly(error, "Upload failed");
  const name = path.slice(path.lastIndexOf("/") + 1);
  return { type: "file", name, path, size, mimeType: contentType || null, updatedAt: new Date().toISOString(), publicUrl: publicUrl(bucket, path), kind: fileKind({ type: contentType, name }) };
}

// ---------------------------------------------------------------------------------------------
// Folders, moving, deleting
// ---------------------------------------------------------------------------------------------

/** A new, empty folder: Storage folders exist through their files, so it gets a zero-byte placeholder. Returns its path. */
export async function createFolder(bucket: string, prefix: string, name: string): Promise<string> {
  const found = await requireBucket(bucket);
  if (found.name === MEDIA_BUCKET) throw new Error("Photo folders are fixed (one per part of the site). Make folders in Files or another bucket.");
  const slug = folderSlug(String(name ?? ""));
  if (!slug) throw new Error("Use letters or numbers in the folder name.");
  const path = joinPath(cleanPath(String(prefix ?? "")), slug);
  const db = client();
  const { error } = await db.storage.from(found.name).upload(joinPath(path, PLACEHOLDER), new Blob([]), { upsert: false, cacheControl: "3600" });
  if (error && !isDuplicate(error)) throw friendly(error, "Couldn't make the folder");
  return path;
}

/** Every object under a folder, placeholders included (breadth first, a thousand at a time). */
async function objectsUnder(db: Db, bucket: string, folder: string): Promise<string[]> {
  const found: string[] = [];
  const queue = [folder];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (let offset = 0; ; offset += LIST_PAGE) {
      const { data, error } = await db.storage.from(bucket).list(current, { limit: LIST_PAGE, offset, sortBy: { column: "name", order: "asc" } });
      if (error) throw friendly(error, "Couldn't read the folder");
      for (const item of data as ListedObject[]) {
        const path = joinPath(current, item.name);
        if (item.id) found.push(path);
        else queue.push(path);
      }
      if (found.length > MAX_BATCH) throw new Error("That folder holds too many files to handle at once.");
      if (data.length < LIST_PAGE) break;
    }
  }
  return found;
}

/** Whether a path is a folder (something is listed under it). A file's path lists nothing. */
async function isFolder(db: Db, bucket: string, path: string): Promise<boolean> {
  const { data } = await db.storage.from(bucket).list(path, { limit: 1 });
  return (data ?? []).length > 0;
}

/**
 * Moves or renames a file or a whole folder (every object under it). Never overwrites: a
 * name that's taken at the destination stops the move with a message.
 */
export async function moveObject(bucket: string, from: string, to: string): Promise<void> {
  const found = await requireBucket(bucket);
  if (found.name === MEDIA_BUCKET) throw new Error(PHOTOS_ONLY);
  const source = cleanPath(String(from ?? ""));
  const target = cleanPath(String(to ?? ""));
  if (!source || !target) throw new Error("Pick what to move and where.");
  if (source === target) return;
  if (target.startsWith(`${source}/`)) throw new Error("A folder can't be moved into itself.");
  const db = client();
  const api = db.storage.from(found.name);
  if (await isFolder(db, found.name, source)) {
    for (const path of await objectsUnder(db, found.name, source)) {
      const destination = `${target}${path.slice(source.length)}`;
      const { error } = await api.move(path, destination);
      if (error) throw isDuplicate(error) ? new Error(`Stopped: “${destination}” already exists there.`) : friendly(error, "Couldn't move everything");
    }
    return;
  }
  if (await exists(db, found.name, target)) throw new Error(`There's already a file called “${target.slice(target.lastIndexOf("/") + 1)}” there.`);
  const { error } = await api.move(source, target);
  if (error) throw isDuplicate(error) ? new Error("A file with that name is already there.") : friendly(error, "Couldn't move it");
}

/** What's at a path: a folder (something is stored under it), a file, or nothing. The top level counts as a folder. */
export async function pathKind(bucket: string, path: string): Promise<"folder" | "file" | null> {
  const found = await requireBucket(bucket);
  const target = cleanPath(String(path ?? ""));
  if (!target) return "folder";
  const db = client();
  if (await isFolder(db, found.name, target)) return "folder";
  return (await exists(db, found.name, target)) ? "file" : null;
}

/**
 * Every folder in a bucket, A→Z, for "Move to…". A very big bucket stops early
 * (`complete` false) rather than listing for minutes.
 */
export async function listFolderPaths(
  bucket: string,
  { maxFolders = 500, maxCalls = 80 }: { maxFolders?: number; maxCalls?: number } = {},
): Promise<{ paths: string[]; complete: boolean }> {
  const found = await requireBucket(bucket);
  const api = client().storage.from(found.name);
  const paths: string[] = [];
  const queue = [""];
  let calls = 0;
  let complete = true;
  walk: while (queue.length > 0) {
    const current = queue.shift()!;
    for (let offset = 0; ; offset += LIST_PAGE) {
      if (calls++ >= maxCalls) {
        complete = false;
        break walk;
      }
      const { data, error } = await api.list(current, { limit: LIST_PAGE, offset, sortBy: { column: "name", order: "asc" } });
      if (error) throw friendly(error, "Couldn't read the folders");
      for (const item of data as ListedObject[]) {
        if (item.id || item.name === PLACEHOLDER) continue;
        const path = joinPath(current, item.name);
        paths.push(path);
        queue.push(path);
      }
      if (paths.length >= maxFolders) {
        complete = false;
        break walk;
      }
      if (data.length < LIST_PAGE) break;
    }
  }
  return { paths: paths.slice(0, maxFolders).sort((a, b) => a.localeCompare(b)), complete };
}

/** A link that opens one file: its public link in a public bucket, else a signed link that works for `seconds`. */
export async function fileLink(bucket: string, path: string, seconds = 3600): Promise<string> {
  const found = await requireBucket(bucket);
  const target = cleanPath(String(path ?? ""));
  if (!target) throw new Error("Pick a file first.");
  if (found.public) return publicUrl(found.name, target);
  const { data, error } = await client().storage.from(found.name).createSignedUrl(target, seconds);
  if (error || !data) throw friendly(error ?? { message: "no link was returned" }, "Couldn't make a link to it");
  return data.signedUrl;
}

/** Deletes files and folders (with everything inside). Returns how many objects went. */
export async function removeObjects(bucket: string, paths: string[]): Promise<number> {
  const found = await requireBucket(bucket);
  if (found.name === MEDIA_BUCKET) throw new Error(PHOTOS_ONLY);
  const db = client();
  const targets = new Set<string>();
  for (const raw of paths.slice(0, 500)) {
    const path = cleanPath(String(raw ?? ""));
    if (!path) continue;
    if (await isFolder(db, found.name, path)) for (const inside of await objectsUnder(db, found.name, path)) targets.add(inside);
    else targets.add(path);
    if (targets.size > MAX_BATCH) throw new Error("That's too many files to delete at once.");
  }
  const all = [...targets];
  let removed = 0;
  for (let i = 0; i < all.length; i += LIST_PAGE) {
    const { data, error } = await db.storage.from(found.name).remove(all.slice(i, i + LIST_PAGE));
    if (error) throw friendly(error, removed > 0 ? `Deleted ${removed}, then stopped` : "Couldn't delete");
    removed += data?.length ?? 0;
  }
  return removed;
}

// ---------------------------------------------------------------------------------------------
// Buckets
// ---------------------------------------------------------------------------------------------

export type BucketSettings = { public: boolean; allowedMimeTypes: string[] | null; fileSizeLimit: number | null };

function cleanTypes(types: string[] | null): string[] | null {
  const list = (types ?? [])
    .map((type) => type.trim().toLowerCase())
    .filter((type) => /^[a-z0-9.+-]+\/(\*|[a-z0-9.+-]+)$/.test(type))
    .slice(0, 50);
  return list.length > 0 ? list : null;
}

export async function createBucket(name: string, settings: BucketSettings): Promise<StorageBucket> {
  const id = String(name ?? "").trim().toLowerCase();
  if (!BUCKET_NAME.test(id)) throw new Error("Bucket names use 2–63 lowercase letters, digits, hyphens or underscores, starting with a letter or digit.");
  const { error } = await client().storage.createBucket(id, {
    public: settings.public,
    allowedMimeTypes: cleanTypes(settings.allowedMimeTypes),
    fileSizeLimit: settings.fileSizeLimit && settings.fileSizeLimit > 0 ? Math.round(settings.fileSizeLimit) : null,
  });
  if (error) throw isDuplicate(error) ? new Error("There's already a bucket with that name.") : friendly(error, "Couldn't make the bucket");
  return requireBucket(id);
}

export async function updateBucket(name: string, settings: BucketSettings): Promise<StorageBucket> {
  const bucket = await requireBucket(name);
  if (bucket.protected && !settings.public) throw new Error(`${bucket.label} must stay public: the site loads its ${bucket.name === MEDIA_BUCKET ? "photos" : "files"} from it.`);
  const allowed = cleanTypes(settings.allowedMimeTypes);
  if (bucket.name === MEDIA_BUCKET && allowed && !(typeAllowed(allowed, "image/webp") && typeAllowed(allowed, "image/jpeg"))) {
    throw new Error("Photos has to accept WebP and JPEG files: those are the sizes the site builds.");
  }
  const { error } = await client().storage.updateBucket(bucket.name, {
    public: settings.public,
    allowedMimeTypes: allowed,
    fileSizeLimit: settings.fileSizeLimit && settings.fileSizeLimit > 0 ? Math.round(settings.fileSizeLimit) : null,
  });
  if (error) throw friendly(error, "Couldn't save the bucket");
  return requireBucket(bucket.name);
}

/** Empties a bucket and deletes it. Photos and Files can't be deleted. */
export async function deleteBucket(name: string): Promise<void> {
  const bucket = await requireBucket(name);
  if (bucket.protected) throw new Error(`${bucket.label} can't be deleted: the site serves from it.`);
  const db = client();
  const { error: emptyError } = await db.storage.emptyBucket(bucket.name);
  if (emptyError) throw friendly(emptyError, "Couldn't empty the bucket");
  const { error } = await db.storage.deleteBucket(bucket.name);
  if (error) throw /not empty/i.test(error.message) ? new Error("The bucket is still being emptied. Try again in a minute.") : friendly(error, "Couldn't delete the bucket");
}
