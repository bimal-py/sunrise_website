import type { NextConfig } from "next";

const YEAR = 60 * 60 * 24 * 365;

type Redirect = Awaited<ReturnType<NonNullable<NextConfig["redirects"]>>>[number];
type SavedRedirect = { source: string; destination: string; permanent: boolean };

// The same rules as features/redirects/domain/redirect-rules.ts (this file can't import app code).
/** Film, service, print, blog and product detail pages look redirects up themselves (redirectOrNotFound). */
const DETAIL_PATH = /^\/(films|services|prints|blogs|merchandise)\/[^/]+$/;
const PROTECTED_PATH = /^\/(dashboard|api|_next)(\/|$)/i;
const BASE = "http://n";

/** path-to-regexp reads these as route syntax; escaped, a saved address matches only itself. */
const literalSource = (path: string) => path.replace(/[()[\]{}|\\^.:*+?$-]/g, "\\$&");
/** In a destination they're percent-encoded instead (a backslash wouldn't survive URL parsing). */
const literalPath = (text: string) => text.replace(/[:*+?(){}]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);

function decoded(path: string): string {
  try {
    return decodeURI(path);
  } catch {
    return path;
  }
}

/** The destination with no route syntax left in it, or null if it isn't a usable address. */
function safeDestination(destination: string): string | null {
  try {
    if (/^https?:\/\//i.test(destination)) {
      const url = new URL(destination);
      return `${url.origin}${literalPath(url.pathname)}${url.search}${literalPath(url.hash)}`;
    }
    if (!destination.startsWith("/") || destination.startsWith("//") || destination.includes("\\")) return null;
    const url = new URL(destination, BASE);
    return `${literalPath(url.pathname)}${url.search}${literalPath(url.hash)}`;
  } catch {
    return null;
  }
}

/** Where a destination lands on this site (lowercase, decoded path), null for another site. */
function internalPath(destination: string): string | null {
  if (!destination.startsWith("/") || destination.startsWith("//")) return null;
  try {
    const url = new URL(destination, BASE);
    return url.host === "n" ? decoded(url.pathname).replace(/(.)\/+$/, "$1").toLowerCase() : null;
  } catch {
    return null;
  }
}

/** The address as typed, decoded and percent-encoded (as browsers send it), so either form matches. */
function sourceVariants(source: string): string[] {
  const plain = decoded(source);
  const variants = new Set([source, plain]);
  const encoded = new URL(plain, BASE).pathname;
  // Only when encoding is all that changed (URL parsing also resolves "/a/../b" to "/b").
  if (decoded(encoded) === plain) variants.add(encoded);
  return [...variants].filter((variant) => variant.startsWith("/") && variant.length <= 2000);
}

function toNextRedirects(rows: SavedRedirect[]): Redirect[] {
  const valid = rows.filter((r) => typeof r.source === "string" && /^\/[^\s?#]*$/.test(r.source) && typeof r.destination === "string" && typeof r.permanent === "boolean");
  // Next applies one redirect per request; a chain that comes back round would loop forever.
  const hop = new Map(valid.map((r) => [decoded(r.source).toLowerCase(), internalPath(r.destination)]));
  const loops = (source: string) => {
    const start = decoded(source).toLowerCase();
    let at = hop.get(start) ?? null;
    for (let step = 0; at !== null && step < 25; step++) {
      if (at === start) return true;
      at = hop.get(at) ?? null;
    }
    return at !== null;
  };
  return valid.flatMap((r): Redirect[] => {
    const destination = safeDestination(r.destination);
    if (!destination || r.source === "/" || PROTECTED_PATH.test(r.source) || DETAIL_PATH.test(r.source) || loops(r.source)) return [];
    try {
      return sourceVariants(r.source).map((source) => ({ source: literalSource(source), destination, permanent: r.permanent }));
    } catch {
      return []; // one odd row never costs the others
    }
  });
}

/**
 * Redirects saved in the dashboard (Settings → Redirects), read once per build. They're for
 * arbitrary old addresses, e.g. pages of the previous Astro site, which no route here would
 * ever catch. Old film, service, print, blog and product addresses are left out: their detail pages
 * look redirects up the moment a slug isn't found (features/site/data/redirects.repository.ts),
 * so a rename works without a deploy and a live page always wins over a stale redirect.
 * Any failure means building without them: a redirect is never worth a failed deploy.
 */
async function savedRedirects(): Promise<Redirect[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const response = await fetch(`${url}/rest/v1/redirects?select=source,destination,permanent&order=source`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rows: unknown = await response.json();
    return Array.isArray(rows) ? toNextRedirects(rows as SavedRedirect[]) : [];
  } catch (error) {
    console.warn(`[redirects] Couldn't load the saved redirects; continuing without them. ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

const isDev = process.env.NODE_ENV === "development";
// Vercel's toolbar (comments, feedback) runs on preview deployments only.
const isPreview = process.env.VERCEL_ENV === "preview";

function originOf(value: string | undefined): string {
  try {
    return value ? new URL(value).origin : "";
  } catch {
    return "";
  }
}

const SUPABASE = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL);
const CLARITY_SCRIPTS = ["https://www.clarity.ms", "https://scripts.clarity.ms"];
const CLARITY_BEACONS = ["https://*.clarity.ms", "https://c.bing.com"];
const ICONIFY = "https://api.iconify.design"; // dashboard icon search + icon previews
const VERCEL_LIVE = isPreview ? ["https://vercel.live"] : [];

function policy(directives: Record<string, string[]>): string {
  return Object.entries(directives)
    .map(([name, values]) => [name, ...values.filter(Boolean)].join(" "))
    .join("; ");
}

/**
 * Pages are static (CLAUDE.md §11), so Next's inline scripts can't carry a nonce and
 * script-src keeps 'unsafe-inline'. The rest still earns its keep: no foreign scripts,
 * frames, fetches or beacons, no plugins, no <base>, no foreign form targets, no framing.
 * Tested against the live pages (home, films + YouTube player, blog, services, prints,
 * contact, about, login) with zero violations.
 */
const SITE_CSP = policy({
  "default-src": ["'self'"],
  "script-src": ["'self'", "'unsafe-inline'", ...CLARITY_SCRIPTS, ...(isDev ? ["'unsafe-eval'"] : []), ...VERCEL_LIVE],
  "style-src": ["'self'", "'unsafe-inline'", ...VERCEL_LIVE],
  "img-src": ["'self'", "data:", "blob:", SUPABASE, ...CLARITY_BEACONS, ICONIFY, ...VERCEL_LIVE, ...(isPreview ? ["https://vercel.com"] : [])],
  "font-src": ["'self'", ...(isPreview ? ["https://vercel.live", "https://assets.vercel.com"] : [])],
  "connect-src": ["'self'", SUPABASE, ...CLARITY_BEACONS, ICONIFY, ...(isDev ? ["ws:"] : []), ...(isPreview ? ["https://vercel.live", "wss://ws-us3.pusher.com"] : [])],
  "frame-src": ["https://www.youtube-nocookie.com", ...VERCEL_LIVE],
  "media-src": ["'self'"],
  "manifest-src": ["'self'"],
  "worker-src": ["'self'", "blob:"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'none'"],
  ...(isDev ? {} : { "upgrade-insecure-requests": [] }),
});

/**
 * Every path except root files (single-segment names with an extension, and
 * /api/root-files/*): those get their own CSP (sandbox) from their route.
 */
const NOT_ROOT_FILES = "/:path((?!api/root-files/)(?![^/]*\\.[A-Za-z0-9]{1,8}$).*)";
const ROOT_FILES = "/:name([A-Za-z0-9][A-Za-z0-9._-]*\\.[A-Za-z0-9]{1,8})";

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: SITE_CSP },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Only features the site never uses; the YouTube iframe's own allow= list is left alone.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), hid=(), bluetooth=(), midi=(), magnetometer=(), display-capture=(), browsing-topics=()",
  },
];

/** Root files: the transport headers only; the route sets Content-Type, nosniff and its own CSP. */
const FILE_HEADERS = SECURITY_HEADERS.filter(({ key }) => key === "Strict-Transport-Security" || key === "Referrer-Policy");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Dashboard photo uploads (shrunk to under 4 MB in the browser; Vercel's cap is 4.5 MB).
    serverActions: { bodySizeLimit: "4.5mb" },
    // The stylesheet goes inside the HTML, so the first paint doesn't wait for a second
    // request (measured: about 1.3 s sooner on a slow mobile first visit).
    inlineCss: true,
  },
  images: {
    // Images are pre-built (scripts/optimize-images.py) and picked by our own
    // loader, so nothing is resized on request: no cold-start wait, no usage quota.
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
    // srcset widths = the pre-built sizes, so every candidate is a real file.
    deviceSizes: [480, 800, 1280],
    imageSizes: [],
  },
  async headers() {
    // Image files never change in place (a new picture gets a new name), so
    // browsers and the CDN can keep them for a year without re-checking.
    const immutable = [{ key: "Cache-Control", value: `public, max-age=${YEAR}, immutable` }];
    return [
      { source: NOT_ROOT_FILES, headers: SECURITY_HEADERS },
      { source: ROOT_FILES, headers: FILE_HEADERS },
      { source: "/api/root-files/:name*", headers: FILE_HEADERS },
      // The dashboard: never indexed (also non-HTML responses), no referrer to other sites.
      {
        source: "/dashboard/:path*",
        headers: [
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      { source: "/api/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex" }] },
      { source: "/images/:path*", headers: immutable },
      { source: "/brand/:path*", headers: immutable },
    ];
  },
  async redirects() {
    return savedRedirects();
  },
  async rewrites() {
    return {
      // Root files (dashboard → Root Files: /ads.txt, google….html, BingSiteAuth.xml) and the
      // IndexNow key file. Fallback rewrites run only after every page, public file, dynamic
      // route and metadata route (robots.txt, sitemap.xml, the icons) has been tried, so only
      // a single-segment name with an extension that would otherwise 404 reaches the handler.
      fallback: [{ source: "/:name([A-Za-z0-9][A-Za-z0-9._-]*\\.[A-Za-z0-9]{1,8})", destination: "/api/root-files/:name" }],
    };
  },
};

export default nextConfig;
