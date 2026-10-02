import type { MediaCollection } from "@/lib/media/process-image";
import { slugify } from "@/lib/utils/slug";

/**
 * The file manager's view of Supabase Storage (supabase/migrations/0001_initial_schema.sql):
 * "media" holds the photos the dashboard processed (lib/media/process-image.ts), "files"
 * anything else (PDFs, price lists…). Pure helpers only; Storage calls live in data/.
 */
export type BucketId = "media" | "files";

export const BUCKETS: { id: BucketId; label: string }[] = [
  { id: "media", label: "Photos" },
  { id: "files", label: "Files" },
];

export function bucketLabel(bucket: BucketId): string {
  return bucket === "media" ? "Photos" : "Files";
}

/**
 * One photo folder per part of the site (MEDIA_COLLECTIONS in lib/media/process-image.ts).
 * Typed by the collection list, so adding a collection there fails to compile until it's named here.
 */
export const PHOTO_FOLDERS: Record<MediaCollection, string> = {
  blog: "Blog covers and photos in posts",
  films: "Film thumbnails and stills",
  founder: "The founder's portrait",
  site: "The default share image and other studio-wide photos",
  pages: "Photos on the fixed pages (about, contact…)",
  offerings: "Photos for services and prints",
};

export function isPhotoFolder(name: string): name is MediaCollection {
  return Object.keys(PHOTO_FOLDERS).includes(name);
}

/** Entries fetched per request ("Show more" fetches the next lot). */
export const PAGE_SIZE = 100;
/** Supabase's stand-in object that keeps an empty folder alive. Never shown. */
export const PLACEHOLDER = ".emptyFolderPlaceholder";
/** Each photo's 1200×630 link-preview image lives in "<collection>/og/". */
export const SHARE_FOLDER = "og";
/** The sizes every upload gets (IMAGE_WIDTHS in lib/media/process-image.ts, a server-only module). */
export const STANDARD_WIDTHS = [480, 800, 1280];
/** The "files" bucket's per-file limit (26214400 bytes). */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export type FolderEntry = { name: string; path: string };

export type FileEntry = {
  name: string;
  /** Path inside the bucket, e.g. "price-lists/albums-2026.pdf". */
  path: string;
  size: number;
  type: string;
  updatedAt: string | null;
  /** Public URL (both buckets are public). */
  url: string;
};

/** One folder's contents as loaded so far. */
export type Listing = {
  folders: FolderEntry[];
  files: FileEntry[];
  /** Objects fetched, the placeholder included: the next page's offset. */
  rawCount: number;
  hasMore: boolean;
  /** The folder exists only through its placeholder (so it can be removed when empty). */
  placeholder: boolean;
};

/**
 * One processed photo: all the files that share its name, shown as one tile.
 * In "<collection>/" those are its sizes (<name>-480.webp, -800, -1280); in
 * "<collection>/og/" its share image (<name>.jpg).
 */
export type Picture = {
  collection: string;
  name: string;
  /** Widths found in the folder, ascending (empty in the og/ folder, where they aren't listed). */
  widths: number[];
  view: "sizes" | "share";
  updatedAt: string | null;
};

// Same rules as the media table's checks (collection ~ '^[a-z0-9-]{1,40}$', name ~ '^[A-Za-z0-9_-]{1,120}$').
const COLLECTION = /^[a-z0-9-]{1,40}$/;
const NAME = /^[A-Za-z0-9_-]{1,120}$/;
const SIZED = /^(.+)-(\d{2,4})\.webp$/;
const SHARE = /^(.+)\.jpg$/;

/** "a//b/../c/" → "a/b/c": a folder path from the URL, without empty or relative parts. */
export function cleanPath(raw: string): string {
  return raw
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
}

export function joinPath(prefix: string, name: string): string {
  return prefix ? `${prefix}/${name}` : name;
}

export function parentPath(path: string): string {
  return path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
}

/** Whether a Photos folder holds processed photos: a collection ("films") or its share images ("films/og"). */
export function photoFolderOf(prefix: string): { collection: string; view: Picture["view"] } | null {
  const parts = prefix.split("/").filter(Boolean);
  if (!parts[0] || !COLLECTION.test(parts[0])) return null;
  if (parts.length === 1) return { collection: parts[0], view: "sizes" };
  if (parts.length === 2 && parts[1] === SHARE_FOLDER) return { collection: parts[0], view: "share" };
  return null;
}

/** Groups a Photos folder's files into one picture per name; anything else stays a plain file. */
export function groupPictures(files: FileEntry[], prefix: string): { pictures: Picture[]; others: FileEntry[] } {
  const folder = photoFolderOf(prefix);
  if (!folder) return { pictures: [], others: files };
  const byName = new Map<string, Picture>();
  const others: FileEntry[] = [];
  for (const file of files) {
    const match = (folder.view === "sizes" ? SIZED : SHARE).exec(file.name);
    if (!match || !NAME.test(match[1])) {
      others.push(file);
      continue;
    }
    const picture = byName.get(match[1]) ?? { collection: folder.collection, name: match[1], widths: [], view: folder.view, updatedAt: null };
    if (folder.view === "sizes") picture.widths.push(Number(match[2]));
    if (file.updatedAt && (!picture.updatedAt || file.updatedAt > picture.updatedAt)) picture.updatedAt = file.updatedAt;
    byName.set(match[1], picture);
  }
  const pictures = [...byName.values()];
  for (const picture of pictures) picture.widths.sort((a, b) => a - b);
  return { pictures, others };
}

/** A just-uploaded photo that isn't in the loaded part of the listing yet (it was given every standard size). */
export function uploadedPicture(collection: string, name: string): Picture {
  return { collection, name, widths: [...STANDARD_WIDTHS], view: "sizes", updatedAt: new Date().toISOString() };
}

/** "…/films/bride-groom-k3j9x2.webp" (an upload's src) → "bride-groom-k3j9x2". */
export function nameFromSrc(src: string): string {
  return decodeURIComponent(src.slice(src.lastIndexOf("/") + 1)).replace(/\.webp$/, "");
}

/** Adds a "Show more" page to what's loaded (skipping anything already there, should the folder have shifted). */
export function mergeListings(loaded: Listing, next: Listing): Listing {
  const seen = new Set([...loaded.folders, ...loaded.files].map((entry) => entry.path));
  return {
    folders: [...loaded.folders, ...next.folders.filter((folder) => !seen.has(folder.path))],
    files: [...loaded.files, ...next.files.filter((file) => !seen.has(file.path))],
    rawCount: loaded.rawCount + next.rawCount,
    hasMore: next.hasMore,
    placeholder: loaded.placeholder || next.placeholder,
  };
}

/** "Price List (2026).PDF" → { base: "price-list-2026", ext: ".pdf" }: a readable name that's safe in a link. */
export function safeFileName(original: string): { base: string; ext: string } {
  const dot = original.lastIndexOf(".");
  const rawExt = dot > 0 ? original.slice(dot + 1) : "";
  const ext = /^[A-Za-z0-9]{1,10}$/.test(rawExt) ? `.${rawExt.toLowerCase()}` : "";
  const stem = ext ? original.slice(0, dot) : original;
  const base = slugify(stem).slice(0, 80).replace(/-+$/, "") || "file";
  return { base, ext };
}

/** "Price Lists" → "price-lists" (latin letters, digits and hyphens). Empty when nothing usable is left. */
export function folderSlug(input: string): string {
  return slugify(input).slice(0, 60).replace(/-+$/, "");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

export function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export type FileKind = "image" | "video" | "audio" | "pdf" | "sheet" | "archive" | "other";

/** What a file is, from its type (with the extension as a fallback). */
export function fileKind(file: { type: string; name: string }): FileKind {
  const type = file.type.toLowerCase();
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/") || ["mp4", "mov", "webm", "mkv"].includes(ext)) return "video";
  if (type.startsWith("audio/") || ["mp3", "wav", "m4a", "ogg"].includes(ext)) return "audio";
  if (type === "application/pdf" || ext === "pdf") return "pdf";
  if (["xls", "xlsx", "csv", "ods"].includes(ext)) return "sheet";
  if (["zip", "rar", "7z", "gz"].includes(ext)) return "archive";
  return "other";
}
