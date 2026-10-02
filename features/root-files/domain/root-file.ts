/**
 * Root files: small text files served at the top of the site (/ads.txt, Google Search
 * Console's google….html, Bing's BingSiteAuth.xml), kept in the `root_files` table and
 * served by app/api/root-files/[name] through the fallback rewrite in next.config.ts.
 */

/** The database's rule (and the rewrite's): one name with an extension, no folders. */
export const ROOT_FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}\.[A-Za-z0-9]{1,8}$/;

/** The database's limit on a file's text. */
export const ROOT_FILE_MAX_BODY = 200_000;

/** The content types a root file may be served with; anything else is served as plain text. */
export const ROOT_FILE_TYPES = [
  { value: "text/plain; charset=utf-8", label: "Plain text (.txt)" },
  { value: "text/html; charset=utf-8", label: "HTML (.html)" },
  { value: "application/xml; charset=utf-8", label: "XML (.xml)" },
  { value: "application/json; charset=utf-8", label: "JSON (.json)" },
  { value: "text/csv; charset=utf-8", label: "CSV (.csv)" },
] as const;

export type RootFileType = (typeof ROOT_FILE_TYPES)[number]["value"];

export const DEFAULT_ROOT_FILE_TYPE: RootFileType = "text/plain; charset=utf-8";

export function isRootFileType(value: string): value is RootFileType {
  return ROOT_FILE_TYPES.some((type) => type.value === value);
}

/** "HTML" for "text/html; charset=utf-8" (the dashboard's list). */
export function rootFileTypeLabel(value: string): string {
  return ROOT_FILE_TYPES.find((type) => type.value === value)?.label.replace(/ \(.*\)$/, "") ?? value;
}

// Files the app serves itself (metadata routes and build output): a root file of the same
// name would never be reached, so the dashboard refuses them.
const RESERVED = new Set(["robots.txt", "sitemap.xml", "favicon.ico", "manifest.webmanifest", "manifest.json", "icon.png", "apple-icon.png"]);

export function isReservedRootFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return RESERVED.has(lower) || lower.startsWith("_next");
}
