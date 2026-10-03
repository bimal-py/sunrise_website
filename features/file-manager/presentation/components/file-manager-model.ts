import {
  pictureUrl,
  type StorageFile,
  type StorageFolder,
  type StorageListing,
  type StoragePicture,
} from "@/features/file-manager/domain/entities";

/**
 * Pure helpers for the file manager's client components: what a folder shows so far, keys,
 * search, dates and a processed photo's links. No Storage calls here.
 */

/** The bucket of processed photos (MEDIA_BUCKET in lib/media/process-image.ts, a server-only module). */
export const PHOTOS_BUCKET = "media";
/** Raw pictures bigger than this show an icon in the grid rather than downloading the whole file as a thumbnail. */
export const THUMB_LIMIT = 3_000_000;
/** …and in the details dialog, where it's asked for. */
export const PREVIEW_LIMIT = 10_000_000;

export type Entry = StorageFolder | StorageFile | StoragePicture;
/** Something with a details dialog (folders open instead). */
export type Item = StorageFile | StoragePicture;

/** A folder as loaded so far: the server's first page plus any "Show more" pages. */
export type Loaded = { folders: StorageFolder[]; files: StorageFile[]; pictures: StoragePicture[]; nextOffset: number | null };

export const EMPTY: Loaded = { folders: [], files: [], pictures: [], nextOffset: null };

export function toLoaded(listing: StorageListing | null): Loaded {
  if (!listing) return EMPTY;
  return { folders: listing.folders, files: listing.files, pictures: listing.pictures, nextOffset: listing.nextOffset };
}

/** Adds a page, skipping anything already there (should the folder have shifted between pages). */
export function mergeLoaded(before: Loaded, page: StorageListing): Loaded {
  const seen = new Set([...before.folders, ...before.files, ...before.pictures].map(entryKey));
  const fresh = <T extends Entry>(entries: T[]) => entries.filter((entry) => !seen.has(entryKey(entry)));
  return {
    folders: [...before.folders, ...fresh(page.folders)],
    files: [...before.files, ...fresh(page.files)],
    pictures: [...before.pictures, ...fresh(page.pictures)],
    nextOffset: page.nextOffset,
  };
}

/** A picture the browser can draw (iPhone HEIC photos mostly can't be shown outside Safari). */
export function drawable(file: StorageFile): boolean {
  return file.kind === "image" && !/hei[cf]/i.test(file.mimeType ?? "") && !/\.(heic|heif)$/i.test(file.name);
}

/** Unique across one listing: "d:price-lists", "f:price-lists/2026.pdf", "p:films/bride-k3j9x2". */
export function entryKey(entry: Entry): string {
  return `${entry.type === "folder" ? "d" : entry.type === "file" ? "f" : "p"}:${entry.path}`;
}

export function entryName(entry: Entry): string {
  return entry.type === "picture" ? entry.alt || entry.name : entry.name;
}

/** "Price List" → ["price", "list"]; any script is kept (descriptions may be in Nepali). */
export function searchTokens(text: string): string[] {
  const value = text.trim().toLowerCase();
  if (!value) return [];
  // Letters, their combining marks (Devanagari vowel signs) and digits make up a word.
  const words = value.split(/[^\p{L}\p{M}\p{N}]+/u).filter(Boolean);
  return words.length > 0 ? words : [value];
}

function matches(tokens: string[], ...fields: (string | undefined)[]): boolean {
  const haystack = fields.filter(Boolean).join(" ").toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

/** What's loaded that matches every word (names, and photos' descriptions too). */
export function filterLoaded(loaded: Loaded, tokens: string[]): Loaded {
  if (tokens.length === 0) return loaded;
  return {
    folders: loaded.folders.filter((folder) => matches(tokens, folder.name)),
    files: loaded.files.filter((file) => matches(tokens, file.name)),
    pictures: loaded.pictures.filter((picture) => matches(tokens, picture.name, picture.alt, picture.collection)),
    nextOffset: null,
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Asia/Kathmandu is UTC+5:45 all year (no daylight saving). */
const KATHMANDU_OFFSET = (5 * 60 + 45) * 60_000;

/**
 * "2026-10-01T20:00:00Z" → "2 Oct 2026", in the studio's time zone. Done by hand rather than
 * with Intl, so the server's render and every browser's agree word for word.
 */
export function shortDate(iso: string | null): string {
  if (!iso) return "";
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "";
  const local = new Date(time + KATHMANDU_OFFSET);
  return `${local.getUTCDate()} ${MONTHS[local.getUTCMonth()]} ${local.getUTCFullYear()}`;
}

/** Every link a processed photo has. Shipped photos' links start with "/" (see absoluteUrl). */
export function pictureLinks(picture: StoragePicture) {
  const widths = picture.widths.length > 0 ? picture.widths : [480, 800, 1280];
  const fileWidth = widths.includes(1280) ? 1280 : widths[widths.length - 1];
  return {
    preview: pictureUrl(picture.image.src, widths.includes(800) ? 800 : fileWidth),
    file: pictureUrl(picture.image.src, fileWidth),
    fileWidth,
    widths,
    size: (width: number) => pictureUrl(picture.image.src, width),
    share: picture.image.ogImage,
  };
}

/** A link that works outside the site too ("/images/films/x-1280.webp" → "https://…/images/films/x-1280.webp"). Browser only. */
export function absoluteUrl(url: string): string {
  return url.startsWith("/") && !url.startsWith("//") ? `${window.location.origin}${url}` : url;
}

const SIZED = /^([A-Za-z0-9_-]{1,120})-(\d{2,4})\.webp$/;
const ORIGINAL = /^([A-Za-z0-9_-]{1,120})\.webp$/;
const SHARE = /^([A-Za-z0-9_-]{1,120})\.jpg$/;

/**
 * Which processed photo a stored media file belongs to: "films" + "bride-k3j9x2-800.webp" or
 * "films/og" + "bride-k3j9x2.jpg" → films / bride-k3j9x2. Lets a leftover of a failed upload be
 * cleared out through deletePicture.
 */
export function photoOfFile(prefix: string, fileName: string): { collection: string; name: string; widths: number[] } | null {
  const parts = prefix.split("/").filter(Boolean);
  const collection = parts[0];
  if (!collection || !/^[a-z0-9-]{1,40}$/.test(collection)) return null;
  if (parts.length === 1) {
    const sized = SIZED.exec(fileName);
    if (sized) return { collection, name: sized[1], widths: [Number(sized[2])] };
    const original = ORIGINAL.exec(fileName);
    return original ? { collection, name: original[1], widths: [] } : null;
  }
  if (parts.length === 2 && parts[1] === "og") {
    const share = SHARE.exec(fileName);
    return share ? { collection, name: share[1], widths: [] } : null;
  }
  return null;
}

/** "Client Deliveries!" → "client-deliveries": what Storage accepts as a bucket name (BUCKET_NAME in the domain). */
export function bucketSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 63)
    .replace(/[-_]+$/, "");
}
