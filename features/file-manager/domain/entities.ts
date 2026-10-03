import type { MediaCollection } from "@/lib/media/process-image";
import { slugify } from "@/lib/utils/slug";

/**
 * The file manager's view of Supabase Storage (supabase/migrations/0001_initial_schema.sql):
 * "media" holds the photos the dashboard processed (lib/media/process-image.ts), "files"
 * anything else (PDFs, price lists…). Pure helpers only; Storage calls live in data/.
 */

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
  products: "Merchandise photos",
};

export function isPhotoFolder(name: string): name is MediaCollection {
  return Object.keys(PHOTO_FOLDERS).includes(name);
}

/** Entries fetched per request ("Show more" fetches the next lot). */
export const PAGE_SIZE = 100;
/** Supabase's stand-in object that keeps an empty folder alive. Never shown. */
export const PLACEHOLDER = ".emptyFolderPlaceholder";
/** The "files" bucket's per-file limit (26214400 bytes). */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

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

/** "…/films/bride-groom-k3j9x2.webp" (an upload's src) → "bride-groom-k3j9x2". */
export function nameFromSrc(src: string): string {
  return decodeURIComponent(src.slice(src.lastIndexOf("/") + 1)).replace(/\.webp$/, "");
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

// ---------------------------------------------------------------------------------------------
// Any bucket, read on the server (features/file-manager/data/storage.repository.ts): what the
// file manager and the file picker list. Serializable, so server actions can return them.
// ---------------------------------------------------------------------------------------------

/** The two buckets the site itself serves from: they can't be deleted or made private. */
export const PROTECTED_BUCKETS = ["media", "files"] as const;

export function isProtectedBucket(name: string): boolean {
  return (PROTECTED_BUCKETS as readonly string[]).includes(name);
}

/** Bucket names Storage accepts (and that are safe in a link). */
export const BUCKET_NAME = /^[a-z0-9][a-z0-9_-]{1,62}$/;

export type StorageBucket = {
  id: string;
  name: string;
  /** "Photos" for media, "Files" for files, else the name. */
  label: string;
  /** Public buckets serve their files by link without a token. */
  public: boolean;
  /** media and files: no delete, no making private. */
  protected: boolean;
  createdAt: string | null;
  /** Allowed media types (null = any). */
  allowedMimeTypes: string[] | null;
  /** Largest file in bytes (null = no limit). */
  fileSizeLimit: number | null;
};

export type StorageFolder = {
  type: "folder";
  name: string;
  /** Full path inside the bucket ("price-lists/2026"). */
  path: string;
  /** What a photo folder is for (media collections only). */
  description?: string;
};

export type StorageFile = {
  type: "file";
  name: string;
  path: string;
  size: number;
  mimeType: string | null;
  updatedAt: string | null;
  /** Public link (a private bucket's link only works with a token). */
  publicUrl: string;
  kind: FileKind;
};

/**
 * A processed photo in the media library (a `media` row): its sizes, share image and blur
 * are already built, so it can be used as it is (`image` is what a photo field stores).
 */
export type StoragePicture = {
  type: "picture";
  id: string;
  collection: string;
  name: string;
  /** "<collection>/<name>", unique across the library. */
  path: string;
  image: { src: string; width: number; height: number; blurDataURL: string; ogImage: string };
  alt: string;
  /** False for the photos shipped with the site (/images/…), which live in the code, not in Storage. */
  inStorage: boolean;
  bytes: number;
  createdAt: string | null;
  /** The sizes that exist ("-480.webp", …). */
  widths: number[];
  /** Small (480px) version, for tiles. */
  thumbUrl: string;
  /** 1280px version, to open. */
  fullUrl: string;
};

export type StorageEntry = StorageFolder | StorageFile | StoragePicture;

/** One page of a folder. */
export type StorageListing = {
  bucket: string;
  prefix: string;
  folders: StorageFolder[];
  files: StorageFile[];
  pictures: StoragePicture[];
  /** Offset of the next page ("Show more"), or null when everything is loaded. */
  nextOffset: number | null;
  /** The folder exists only through its placeholder object (so it can be removed when empty). */
  placeholder: boolean;
};

/** The sized files of a processed photo, from its stored src (Storage upload or a photo shipped in /images). */
export function pictureUrl(src: string, width: number): string {
  return src.replace(/\.webp$/, `-${width}.webp`);
}

/** Whether a media type is allowed by a bucket's list ("image/*" style wildcards included). */
export function typeAllowed(allowed: string[] | null, type: string): boolean {
  if (!allowed || allowed.length === 0) return true;
  const value = type.toLowerCase();
  return allowed.some((rule) => {
    const pattern = rule.trim().toLowerCase();
    return pattern.endsWith("/*") ? value.startsWith(pattern.slice(0, -1)) : value === pattern;
  });
}
