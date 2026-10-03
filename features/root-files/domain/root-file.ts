/**
 * Root files: small files served at the top of the site (/ads.txt, Google Search Console's
 * google….html, Bing's BingSiteAuth.xml, a PDF), kept in the `root_files` table and served by
 * app/api/root-files/[name] through the fallback rewrite in next.config.ts. A file is either
 * text (`body`) or an uploaded file in the `files` bucket (`storage_path`), served as it is.
 */

/** The database's rule (and the rewrite's): one name with an extension, no folders. */
export const ROOT_FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}\.[A-Za-z0-9]{1,8}$/;

/** The database's limit on a file's text. */
export const ROOT_FILE_MAX_BODY = 200_000;

/** The bucket uploaded root files are served from. */
export const ROOT_FILE_BUCKET = "files";

/** Common content types for files at the site root; any other valid MIME type can be typed in. */
export const ROOT_FILE_TYPES = [
  { value: "text/plain; charset=utf-8", label: "Plain text: .txt, ads.txt, app-ads.txt" },
  { value: "text/html; charset=utf-8", label: "HTML: .html (Google verification)" },
  { value: "application/xml; charset=utf-8", label: "XML: .xml (BingSiteAuth.xml)" },
  { value: "application/json; charset=utf-8", label: "JSON: .json" },
  { value: "application/manifest+json; charset=utf-8", label: "Web app manifest" },
  { value: "text/csv; charset=utf-8", label: "CSV: .csv" },
  { value: "text/css; charset=utf-8", label: "CSS: .css" },
  { value: "text/javascript; charset=utf-8", label: "JavaScript: .js" },
  { value: "text/markdown; charset=utf-8", label: "Markdown: .md" },
  { value: "application/pdf", label: "PDF" },
  { value: "image/png", label: "PNG image" },
  { value: "image/jpeg", label: "JPEG image" },
  { value: "image/webp", label: "WebP image" },
  { value: "image/svg+xml", label: "SVG image" },
  { value: "image/x-icon", label: "Icon (.ico)" },
  { value: "application/octet-stream", label: "Binary: any other file" },
] as const;

export const DEFAULT_ROOT_FILE_TYPE = "text/plain; charset=utf-8";

/** type/subtype, optionally "; charset=…" (what a Content-Type header may carry here). */
const MIME = /^[a-z0-9][a-z0-9!#$&^_.+-]{0,126}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,126}(; ?charset=[a-z0-9_-]{1,40})?$/i;

/** Whether `value` can be sent as the file's Content-Type. */
export function isRootFileType(value: string): boolean {
  return value.length <= 120 && MIME.test(value);
}

/** "HTML" for "text/html; charset=utf-8" (the dashboard's list); the type itself when it isn't a preset. */
export function rootFileTypeLabel(value: string): string {
  return ROOT_FILE_TYPES.find((type) => type.value === value)?.label.replace(/:.*$| \(.*\)$/, "") ?? value;
}

const BY_EXTENSION: Record<string, string> = {
  txt: "text/plain; charset=utf-8",
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  xml: "application/xml; charset=utf-8",
  json: "application/json; charset=utf-8",
  webmanifest: "application/manifest+json; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
};

/** The usual content type for a file name's extension, or null when it isn't a common one. */
export function rootFileTypeFor(name: string): string | null {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  return BY_EXTENSION[extension] ?? null;
}

/** An object path in the files bucket: folders and a name, nothing that climbs out or looks odd. */
export function isStoragePath(path: string): boolean {
  if (!path || path.length > 500 || path.startsWith("/") || path.endsWith("/")) return false;
  if (/[\\\0-\x1f]/.test(path)) return false;
  return path.split("/").every((part) => part !== "" && part !== "." && part !== "..");
}

// Files the app serves itself (metadata routes and build output): a root file of the same
// name would never be reached, so the dashboard refuses them.
const RESERVED = new Set(["robots.txt", "sitemap.xml", "favicon.ico", "manifest.webmanifest", "manifest.json", "icon.png", "apple-icon.png"]);

export function isReservedRootFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return RESERVED.has(lower) || lower.startsWith("_next");
}
