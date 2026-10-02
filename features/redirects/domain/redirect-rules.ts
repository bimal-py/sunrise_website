import { routes } from "@/lib/routes";

/**
 * Rules for saved redirects (dashboard → Settings → Redirects). next.config.ts repeats the
 * few it needs (it can't import app code): keep the two in step.
 */

/**
 * Detail pages look a redirect up themselves when their slug isn't found
 * (redirectOrNotFound), so these work the moment they're saved and a live page always wins.
 * Every other old address is served by next.config.ts and starts working after a deploy.
 */
export const DETAIL_PATH = /^\/(films|services|prints|blogs)\/([^/]+)$/;

/** Never redirected: the dashboard, the API and Next's own files (Next matches case-insensitively). */
export const PROTECTED_PATH = /^\/(dashboard|api|_next)(\/|$)/i;

/** The site's fixed pages and files: a redirect from one would hide it. */
const SITE_PATHS = new Set(
  [
    routes.home(),
    routes.services(),
    routes.prints(),
    routes.films(),
    routes.blog(),
    routes.about(),
    routes.contact(),
    routes.privacy(),
    "/robots.txt",
    "/sitemap.xml",
    "/manifest.webmanifest",
    "/favicon.ico",
    "/icon.png",
    "/apple-icon.png",
  ].map((path) => path.toLowerCase()),
);

export function isSitePath(path: string): boolean {
  return SITE_PATHS.has(path.toLowerCase());
}

type Parsed<T> = ({ ok: true } & T) | { ok: false; error: string };

function decoded(path: string): string {
  try {
    return decodeURI(path);
  } catch {
    return path;
  }
}

/** A path without its trailing slash ("/" stays "/"). */
function trimSlash(path: string): string {
  return path.length > 1 ? path.replace(/\/+$/, "") || "/" : path;
}

/**
 * Characters Next reads as route syntax (: * + ? ( ) { }), percent-encoded so a destination
 * is used as written. Browsers and servers read "%28" and "(" alike.
 */
function literal(text: string): string {
  return text.replace(/[:*+?(){}]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

/**
 * The old address as a redirect matches it: the path only, no trailing slash (Next strips
 * it before redirects run). "/old-page/", "https://old-site.com/old-page?x=1" → "/old-page".
 */
export function parseSource(input: string): Parsed<{ path: string }> {
  let value = input.trim();
  if (!value) return { ok: false, error: "Give the old address." };
  if (/^https?:\/\//i.test(value)) {
    try {
      value = decoded(new URL(value).pathname);
    } catch {
      return { ok: false, error: "The old address doesn't look like a link." };
    }
  }
  value = trimSlash(value.replace(/[?#].*$/, "").replace(/\/{2,}/g, "/"));
  if (!value.startsWith("/")) return { ok: false, error: "The old address starts with / (e.g. /old-page), or paste the whole link." };
  if (/\s/.test(value)) return { ok: false, error: "The old address can't contain spaces." };
  if (value.length > 300) return { ok: false, error: "The old address is too long (300 characters at most)." };
  return { ok: true, path: value };
}

/**
 * The new address: a path on this site ("/films", or a whole link to this site, which is
 * kept as its path) or a whole link to another site. `path` is the decoded path on this
 * site, null for another site.
 */
export function parseDestination(input: string, siteUrl: string): Parsed<{ value: string; path: string | null }> {
  const value = input.trim();
  if (!value) return { ok: false, error: "Give the new address." };
  const site = new URL(siteUrl);
  const isLink = /^https?:\/\//i.test(value);
  if (!isLink && (!value.startsWith("/") || value.startsWith("//") || value.includes("\\"))) {
    return { ok: false, error: "The new address is a path on this site starting with / (e.g. /films), or a whole link (https://…)." };
  }
  let url: URL;
  try {
    url = new URL(value, site);
  } catch {
    return { ok: false, error: "The new address doesn't look like a link." };
  }
  const host = (name: string) => name.replace(/^www\./, "");
  const external = host(url.hostname) !== host(site.hostname);
  const pathname = external ? url.pathname : trimSlash(url.pathname);
  const result = `${external ? url.origin : ""}${literal(pathname)}${url.search}${literal(url.hash)}`;
  if (result.length > 500) return { ok: false, error: "The new address is too long (500 characters at most)." };
  return { ok: true, value: result, path: external ? null : decoded(pathname) };
}

/** Where a saved destination lands on this site (decoded path), or null for another site. */
export function destinationPath(destination: string, siteUrl: string): string | null {
  const parsed = parseDestination(destination, siteUrl);
  return parsed.ok ? parsed.path : null;
}

/**
 * Whether adding source → destination would send visitors round in a circle through the
 * saved redirects. Compared case-insensitively, as Next matches redirects.
 */
export function createsLoop(saved: { source: string; destination: string }[], source: string, destination: string, siteUrl: string): boolean {
  const next = new Map(saved.map((r) => [r.source.toLowerCase(), destinationPath(r.destination, siteUrl)?.toLowerCase() ?? null]));
  const start = source.toLowerCase();
  let at: string | null = destination.toLowerCase();
  for (let hop = 0; at !== null && hop < 25; hop++) {
    if (at === start) return true;
    at = next.get(at) ?? null;
  }
  return at !== null;
}
