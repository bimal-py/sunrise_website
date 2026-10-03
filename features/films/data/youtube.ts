import "server-only";
import { siteTimeZone } from "@/lib/config/site";

/**
 * The studio's YouTube channel, read without an API key the way youtube.com's own pages are
 * built (tested against the channel in October 2026):
 *
 * - a channel link → its id: innertube `navigation/resolve_url` (1 KB of JSON), else the
 *   channel page's canonical link;
 * - every upload: the uploads playlist page (100 per page) + `youtubei/v1/browse`
 *   continuations, else the Videos and Shorts tabs, else the RSS feed (newest 15 only);
 * - one video: innertube `player` (8 KB): title, description, exact publish time, length,
 *   Shorts, age restriction; else its watch page.
 *
 * YouTube changes these shapes now and then, so the readers accept the old renderers as well
 * as the 2026 "view model" ones and fall back step by step. Every request goes to
 * www.youtube.com (or i.ytimg.com for thumbnails) with a time limit: what the owner typed is
 * only ever a path or a value inside a request, never the host, so these aren't fetches of a
 * user-supplied address. Failures throw YouTubeError, whose message can be shown as it is.
 */

const ORIGIN = "https://www.youtube.com";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};
/** The web client version sent to innertube when a page hasn't told us its own (older versions keep working for months). */
const CLIENT_VERSION = "2.20261002.01.00";
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be", "www.youtu.be", "youtube-nocookie.com", "www.youtube-nocookie.com"]);
/** The most uploads one sync lists. */
export const MAX_UPLOADS = 5000;
/** The most continuation requests one listing makes (the Videos tab pages 30 at a time). */
const MAX_PAGES = 200;

/** A failure worded for the owner. */
export class YouTubeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "YouTubeError";
  }
}

export const isVideoId = (value: string) => VIDEO_ID.test(value);
export const isChannelId = (value: string) => CHANNEL_ID.test(value);

// ---------------------------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------------------------

type RequestOptions = { body?: unknown; timeoutMs?: number; cookie?: string };

async function request(url: string, { body, timeoutMs = 12_000, cookie }: RequestOptions = {}): Promise<Response> {
  const headers: Record<string, string> = { ...HEADERS };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (cookie) headers.Cookie = cookie;
  try {
    return await fetch(url, {
      method: body === undefined ? "GET" : "POST",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    throw new YouTubeError(timedOut ? "YouTube took too long to answer. Try again in a minute." : "Couldn't reach YouTube. Check the connection and try again.");
  }
}

/** EU visitors are sent to a consent page first; the "reject all" cookie skips it. */
function isConsentPage(response: Response): boolean {
  try {
    return new URL(response.url).hostname.startsWith("consent.");
  } catch {
    return false;
  }
}

/** A youtube.com page's HTML. `path` starts with "/". */
async function getPage(path: string): Promise<string> {
  const url = `${ORIGIN}${path}`;
  let response = await request(url);
  if (isConsentPage(response)) response = await request(url, { cookie: "SOCS=CAI" });
  if (response.status === 404) throw new YouTubeError("YouTube has nothing at that link.");
  if (!response.ok) throw new YouTubeError(`YouTube answered with an error (${response.status}). Try again in a minute.`);
  return response.text();
}

type InnertubeEndpoint = "browse" | "player" | "navigation/resolve_url";

/** POST to youtube.com's own JSON API, as its web player does. No key or cookies needed. Returns null for "not found". */
async function innertube(endpoint: InnertubeEndpoint, payload: Record<string, unknown>, clientVersion = CLIENT_VERSION): Promise<unknown> {
  const response = await request(`${ORIGIN}/youtubei/v1/${endpoint}?prettyPrint=false`, {
    body: { context: { client: { clientName: "WEB", clientVersion, hl: "en", gl: "US" } }, ...payload },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new YouTubeError(`YouTube answered with an error (${response.status}). Try again in a minute.`);
  try {
    return await response.json();
  } catch {
    throw new YouTubeError("YouTube sent an answer this site couldn't read. Try again in a minute.");
  }
}

// ---------------------------------------------------------------------------------------------
// Reading YouTube's JSON (shapes vary, so everything is checked)
// ---------------------------------------------------------------------------------------------

type JsonObject = Record<string, unknown>;
const isObject = (value: unknown): value is JsonObject => typeof value === "object" && value !== null && !Array.isArray(value);
const asString = (value: unknown): string => (typeof value === "string" ? value : "");

function at(value: unknown, ...path: (string | number)[]): unknown {
  let current = value;
  for (const key of path) {
    if (typeof key === "number") {
      if (!Array.isArray(current)) return undefined;
      current = current[key];
    } else {
      if (!isObject(current)) return undefined;
      current = current[key];
    }
  }
  return current;
}

/** YouTube's text values: { simpleText }, { runs: [{ text }] } or { content }. */
function textOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (!isObject(value)) return "";
  if (typeof value.simpleText === "string") return value.simpleText;
  if (typeof value.content === "string") return value.content;
  if (Array.isArray(value.runs)) return value.runs.map((run) => asString(at(run, "text"))).join("");
  return "";
}

/** The JSON object that starts at text[start] ("{"), reading strings and escapes properly. */
function readBalancedJson(text: string, start: number): unknown {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth++;
    else if (char === "}" && --depth === 0) return JSON.parse(text.slice(start, i + 1));
  }
  throw new Error("unbalanced JSON");
}

/** `var ytInitialData = {…};`, `window["ytInitialData"] = {…};` and the like, from a page's HTML. */
function pageData(html: string, name: "ytInitialData" | "ytInitialPlayerResponse"): unknown {
  const match = new RegExp(`(?:var\\s+${name}|window\\[["']${name}["']\\]|${name})\\s*=\\s*\\{`).exec(html);
  if (!match) return null;
  try {
    return readBalancedJson(html, match.index + match[0].length - 1);
  } catch {
    return null;
  }
}

const clientVersionOf = (html: string) => /"INNERTUBE_CLIENT_VERSION":"([\d.]+)"/.exec(html)?.[1] ?? CLIENT_VERSION;

// ---------------------------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------------------------

const KATHMANDU_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: siteTimeZone, year: "numeric", month: "2-digit", day: "2-digit" });

/**
 * The calendar day in Kathmandu (YYYY-MM-DD) of a moment YouTube gives in its own zone
 * ("2026-07-25T21:05:57-07:00" is 26 July in Nepal). A bare date is kept as it is; "" when unreadable.
 */
export function kathmanduDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const time = Date.parse(value);
  return Number.isFinite(time) ? KATHMANDU_DAY.format(new Date(time)) : "";
}

/** Today in Kathmandu (YYYY-MM-DD). */
export const kathmanduToday = () => KATHMANDU_DAY.format(new Date());

// ---------------------------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------------------------

/** What was typed, as a youtube.com URL (null if it isn't YouTube). Accepts "@handle", links without https://, m. and youtu.be links. */
function youtubeUrl(input: string): URL | null {
  let text = input.trim();
  if (!text || text.length > 500) return null;
  if (/^@[\w.-]{2,100}$/.test(text)) text = `${ORIGIN}/${text}`;
  else if (!/^[a-z]+:\/\//i.test(text) && /^(www\.|m\.|music\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\//i.test(text)) text = `https://${text}`;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return null;
  return url;
}

/** The video a YouTube link points at, if it's a video link. */
function videoIdOf(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  if (host.endsWith("youtu.be")) {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return VIDEO_ID.test(id) ? id : null;
  }
  const v = url.searchParams.get("v");
  if (url.pathname === "/watch" && v && VIDEO_ID.test(v)) return v;
  const match = /^\/(?:shorts|live|embed|v|e)\/([A-Za-z0-9_-]{11})(?:[/?#]|$)/.exec(url.pathname);
  return match ? match[1] : null;
}

/** "https://youtu.be/xyz…", "…watch?v=…", "…/shorts/…", "…/live/…", "…/embed/…" or a bare id → the 11-character id. */
export function parseYouTubeId(input: string): string | null {
  const text = input.trim();
  if (VIDEO_ID.test(text)) return text;
  const url = youtubeUrl(text);
  return url ? videoIdOf(url) : null;
}

// ---------------------------------------------------------------------------------------------
// Channel id
// ---------------------------------------------------------------------------------------------

/** A channel page's own id: its canonical link (and the tags that agree with it). Not the first "channelId", which can be another channel featured on the page. */
function channelIdFromPage(html: string): string | null {
  const patterns = [
    /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/,
    /<meta property="og:url" content="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/,
    /<meta itemprop="identifier" content="(UC[\w-]{22})"/,
    /"externalId":"(UC[\w-]{22})"/,
    /feeds\/videos\.xml\?channel_id=(UC[\w-]{22})/,
  ];
  for (const pattern of patterns) {
    const id = pattern.exec(html)?.[1];
    if (id) return id;
  }
  return null;
}

/**
 * The channel id (UC…) for what the owner typed: the channel's link in any form
 * (youtube.com/@handle, /channel/UC…, /c/name, /user/name, with or without https:// or www),
 * a bare "@handle" or "UC…" id, or a link to one of its videos. Throws YouTubeError when it
 * can't be found.
 */
export async function resolveChannelId(input: string): Promise<string> {
  const text = String(input ?? "").trim();
  if (!text) throw new YouTubeError("Add the channel's YouTube link first.");
  if (CHANNEL_ID.test(text)) return text;
  const url = youtubeUrl(text);
  if (!url) throw new YouTubeError("Use the channel's YouTube link, like https://www.youtube.com/@yourchannel.");

  const direct = /^\/channel\/(UC[A-Za-z0-9_-]{22})(?:[/?#]|$)/.exec(url.pathname)?.[1];
  if (direct) return direct;

  const videoId = videoIdOf(url);
  if (videoId) {
    const video = await fetchVideoDetails(videoId);
    if (CHANNEL_ID.test(video.channelId)) return video.channelId;
    throw new YouTubeError("Couldn't tell which channel that video belongs to. Use the channel's own link.");
  }

  // Only the path is used: the request always goes to www.youtube.com.
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path === "/" || path.length > 200 || !/^\/[\w@%./-]+$/.test(path)) {
    throw new YouTubeError("That's a YouTube link, but not to a channel. Use the channel's link, like https://www.youtube.com/@yourchannel.");
  }
  const canonical = `${ORIGIN}${path}`;

  // A: innertube resolve_url (1 KB).
  let notFound = false;
  try {
    const answer = await innertube("navigation/resolve_url", { url: canonical });
    if (answer === null) notFound = true;
    const browseId = asString(at(answer, "endpoint", "browseEndpoint", "browseId"));
    if (CHANNEL_ID.test(browseId)) return browseId;
    const watchId = asString(at(answer, "endpoint", "watchEndpoint", "videoId"));
    if (VIDEO_ID.test(watchId)) {
      const video = await fetchVideoDetails(watchId);
      if (CHANNEL_ID.test(video.channelId)) return video.channelId;
    }
  } catch {
    // Try the page instead.
  }

  // B: the channel page's canonical link (1 MB).
  try {
    const id = channelIdFromPage(await getPage(path));
    if (id) return id;
  } catch (error) {
    if (notFound || (error instanceof YouTubeError && /nothing at that link/.test(error.message))) {
      throw new YouTubeError("YouTube has no channel at that link. Check it opens the channel in a browser.");
    }
    throw error;
  }
  throw new YouTubeError(notFound ? "YouTube has no channel at that link. Check it opens the channel in a browser." : "Couldn't find a YouTube channel at that link.");
}

// ---------------------------------------------------------------------------------------------
// Listing every upload
// ---------------------------------------------------------------------------------------------

/** One upload as a listing shows it. `short` = a vertical Short. */
export type ChannelUpload = { id: string; title: string; short: boolean };

/**
 * Where the list came from: the uploads playlist (everything), the Videos and Shorts tabs
 * (everything), or the RSS feed (only the newest 15).
 */
export type UploadSource = "playlist" | "tabs" | "feed";
export type UploadList = { uploads: ChannelUpload[]; source: UploadSource; complete: boolean };

function upload(id: string, title: string, short: boolean): ChannelUpload | null {
  return VIDEO_ID.test(id) ? { id, title: title.trim(), short } : null;
}

/** A video item in any of the shapes YouTube has used (2019 → 2026). */
function asUpload(node: unknown): ChannelUpload | null {
  if (!isObject(node)) return null;
  const lockup = node.lockupViewModel;
  if (isObject(lockup) && typeof lockup.contentId === "string" && lockup.contentType === "LOCKUP_CONTENT_TYPE_VIDEO") {
    return upload(lockup.contentId, textOf(at(lockup, "metadata", "lockupMetadataViewModel", "title")), false);
  }
  const shortLockup = node.shortsLockupViewModel;
  if (isObject(shortLockup)) {
    const id = asString(at(shortLockup, "onTap", "innertubeCommand", "reelWatchEndpoint", "videoId")) || (/([\w-]{11})$/.exec(asString(shortLockup.entityId))?.[1] ?? "");
    return upload(id, textOf(at(shortLockup, "overlayMetadata", "primaryText")) || asString(shortLockup.accessibilityText), true);
  }
  for (const key of ["playlistVideoRenderer", "videoRenderer", "gridVideoRenderer", "compactVideoRenderer"]) {
    const item = node[key];
    if (isObject(item) && typeof item.videoId === "string") {
      if (item.isPlayable === false) return null; // "[Private video]", "[Deleted video]"
      return upload(item.videoId, textOf(item.title), false);
    }
  }
  const reel = node.reelItemRenderer;
  if (isObject(reel) && typeof reel.videoId === "string") return upload(reel.videoId, textOf(reel.headline), true);
  return null;
}

/** The continuation token inside a list's last element (continuationItemRenderer or continuationItemViewModel). */
function tokenIn(node: unknown, depth = 0): string | null {
  if (depth > 8 || node === null || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const token = tokenIn(item, depth + 1);
      if (token) return token;
    }
    return null;
  }
  const command = (node as JsonObject).continuationCommand;
  if (isObject(command) && typeof command.token === "string" && command.token) return command.token;
  for (const value of Object.values(node)) {
    const token = tokenIn(value, depth + 1);
    if (token) return token;
  }
  return null;
}

/**
 * The array holding the most videos anywhere in the reply (the list itself, not a sort chip
 * or a side shelf), and the token at its end for the next page.
 */
function scan(root: unknown): { items: ChannelUpload[]; token: string | null } {
  let best: { items: ChannelUpload[]; token: string | null } = { items: [], token: null };
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      const items: ChannelUpload[] = [];
      for (const element of node) {
        const item = asUpload(at(element, "richItemRenderer", "content") ?? element);
        if (item) items.push(item);
      }
      if (items.length > best.items.length) {
        const last = node[node.length - 1];
        const isContinuation = isObject(last) && ("continuationItemRenderer" in last || "continuationItemViewModel" in last);
        best = { items, token: isContinuation ? tokenIn(last) : null };
      }
      for (const element of node) walk(element);
    } else if (isObject(node)) {
      for (const value of Object.values(node)) walk(value);
    }
  };
  walk(root);
  return best;
}

/** Every video on a list page (playlist or channel tab), following its continuations until done, the cap or the deadline. */
async function listFrom(path: string, deadline: number): Promise<{ uploads: ChannelUpload[]; complete: boolean }> {
  const html = await getPage(path);
  const data = pageData(html, "ytInitialData");
  if (!data) throw new YouTubeError("YouTube's page didn't have its usual data. Try again in a minute.");
  const clientVersion = clientVersionOf(html);
  const found = new Map<string, ChannelUpload>();
  let { items, token } = scan(data);
  for (const item of items) if (!found.has(item.id)) found.set(item.id, item);
  let pages = 0;
  while (token && found.size < MAX_UPLOADS && pages < MAX_PAGES) {
    if (Date.now() > deadline) return { uploads: [...found.values()], complete: false };
    const reply = await innertube("browse", { continuation: token }, clientVersion);
    pages++;
    ({ items, token } = scan(reply));
    if (items.length === 0) break;
    for (const item of items) if (!found.has(item.id)) found.set(item.id, item);
  }
  const uploads = [...found.values()].slice(0, MAX_UPLOADS);
  return { uploads, complete: !token };
}

/** Ids on the channel's Shorts tab (only real Shorts items count, so a channel without the tab gives none). */
async function shortIds(channelId: string, deadline: number): Promise<Set<string>> {
  const { uploads } = await listFrom(`/channel/${channelId}/shorts`, deadline);
  return new Set(uploads.filter((item) => item.short).map((item) => item.id));
}

/**
 * Every public upload of the channel, newest first (at most MAX_UPLOADS): the uploads
 * playlist, else the Videos and Shorts tabs, else the RSS feed (newest 15). `complete` is
 * false when the list was cut short (time, the cap, or only the feed answered).
 */
export async function listAllUploads(channelId: string, { timeBudgetMs = 35_000 }: { timeBudgetMs?: number } = {}): Promise<UploadList> {
  if (!CHANNEL_ID.test(channelId)) throw new YouTubeError("That isn't a YouTube channel id (they start with UC).");
  const deadline = Date.now() + timeBudgetMs;
  const errors: unknown[] = [];

  // 1. The uploads playlist ("UU" + the id's tail): 100 per request, Shorts included as plain items.
  try {
    const playlist = await listFrom(`/playlist?list=UU${channelId.slice(2)}`, deadline);
    if (playlist.uploads.length > 0) {
      const shorts = await shortIds(channelId, deadline).catch(() => new Set<string>());
      return { uploads: playlist.uploads.map((item) => (shorts.has(item.id) ? { ...item, short: true } : item)), source: "playlist", complete: playlist.complete };
    }
  } catch (error) {
    errors.push(error);
  }

  // 2. The Videos tab (30 per request) and the Shorts tab.
  try {
    const videos = await listFrom(`/channel/${channelId}/videos`, deadline);
    const shorts = await listFrom(`/channel/${channelId}/shorts`, deadline).catch(() => ({ uploads: [] as ChannelUpload[], complete: true }));
    const merged = new Map<string, ChannelUpload>();
    for (const item of videos.uploads) merged.set(item.id, item);
    for (const item of shorts.uploads) if (item.short) merged.set(item.id, { ...(merged.get(item.id) ?? item), short: true });
    if (merged.size > 0) return { uploads: [...merged.values()], source: "tabs", complete: videos.complete && shorts.complete };
  } catch (error) {
    errors.push(error);
  }

  // 3. The public feed: only ever the newest 15.
  try {
    const feed = await fetchChannelFeed(channelId);
    return { uploads: feed.map((video) => ({ id: video.id, title: video.title, short: false })), source: "feed", complete: feed.length < 15 };
  } catch (error) {
    errors.push(error);
  }
  const first = errors.find((error) => error instanceof YouTubeError);
  throw first ?? new YouTubeError("Couldn't list the channel's videos. Try again in a minute.");
}

// ---------------------------------------------------------------------------------------------
// One video
// ---------------------------------------------------------------------------------------------

/** What the site keeps about one video. `publishedAt` is the day in Kathmandu ("" if unknown). */
export type VideoDetails = {
  id: string;
  title: string;
  description: string;
  channelId: string;
  publishedAt: string;
  durationSeconds: number | null;
  /** A vertical Short. */
  short: boolean;
  /** YouTube asks viewers to sign in to confirm their age: it won't play in the site's player for most visitors. */
  ageRestricted: boolean;
  /** A premiere or stream that hasn't happened yet, or is live right now. */
  notYetPublished: boolean;
};

function detailsFrom(id: string, player: unknown): VideoDetails | null {
  const details = at(player, "videoDetails");
  const micro = at(player, "microformat", "playerMicroformatRenderer");
  if (!isObject(details) && !isObject(micro)) return null;
  const status = asString(at(player, "playabilityStatus", "status"));
  const reason = asString(at(player, "playabilityStatus", "reason"));
  const length = Number(at(details, "lengthSeconds") ?? at(micro, "lengthSeconds"));
  const live = at(micro, "liveBroadcastDetails");
  const published = asString(at(micro, "publishDate")) || asString(at(micro, "uploadDate"));
  return {
    id,
    title: (asString(at(details, "title")) || textOf(at(micro, "title"))).trim(),
    description: (asString(at(details, "shortDescription")) || textOf(at(micro, "description"))).trim(),
    channelId: asString(at(details, "channelId")) || asString(at(micro, "externalChannelId")),
    publishedAt: published ? kathmanduDate(published) : "",
    durationSeconds: Number.isFinite(length) && length > 0 ? Math.round(length) : null,
    short: at(micro, "isShortsEligible") === true,
    ageRestricted: status === "LOGIN_REQUIRED" && /\bage\b/i.test(reason),
    notYetPublished: at(details, "isUpcoming") === true || at(live, "isLiveNow") === true,
  };
}

/**
 * One video's details from innertube `player` (falling back to its watch page). Throws
 * YouTubeError when YouTube doesn't show the video (private, removed, or a wrong id).
 */
export async function fetchVideoDetails(id: string): Promise<VideoDetails> {
  if (!VIDEO_ID.test(id)) throw new YouTubeError("That isn't a YouTube video id.");
  let firstError: unknown = null;
  try {
    const details = detailsFrom(id, await innertube("player", { videoId: id }));
    if (details?.title) return details;
  } catch (error) {
    firstError = error;
  }
  try {
    const details = detailsFrom(id, pageData(await getPage(`/watch?v=${id}`), "ytInitialPlayerResponse"));
    if (details?.title) return details;
  } catch (error) {
    firstError ??= error;
  }
  if (firstError instanceof YouTubeError && !/nothing at that link/.test(firstError.message)) throw firstError;
  throw new YouTubeError("YouTube doesn't show that video. It may be private or removed, or the link is mistyped.");
}

/** The biggest thumbnail YouTube has for the video. */
export async function fetchThumbnail(id: string): Promise<Buffer> {
  if (!VIDEO_ID.test(id)) throw new YouTubeError("That isn't a YouTube video id.");
  for (const name of ["maxresdefault", "sddefault", "hqdefault"]) {
    const response = await request(`https://i.ytimg.com/vi/${id}/${name}.jpg`, { timeoutMs: 10_000 }).catch(() => null);
    if (!response?.ok) continue;
    const declared = Number(response.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > 5_000_000) continue;
    const body = Buffer.from(await response.arrayBuffer());
    if (body.length > 2000 && body.length <= 5_000_000) return body; // missing sizes come back as a tiny grey placeholder
  }
  throw new YouTubeError("Couldn't download the video's thumbnail.");
}

// ---------------------------------------------------------------------------------------------
// RSS (the last fallback: newest 15)
// ---------------------------------------------------------------------------------------------

export type FeedVideo = { id: string; title: string; publishedAt: string; description: string };

const decode = (text: string) =>
  text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&");

/** The channel's public feed: its newest 15 uploads, dates as Kathmandu days. */
export async function fetchChannelFeed(channelId: string): Promise<FeedVideo[]> {
  if (!CHANNEL_ID.test(channelId)) throw new YouTubeError("That isn't a YouTube channel id (they start with UC).");
  // The feed is flaky (it answers 404 or 500 now and then for channels that exist): one more try.
  let response = await request(`${ORIGIN}/feeds/videos.xml?channel_id=${channelId}`);
  if (response.status === 404 || response.status >= 500) response = await request(`${ORIGIN}/feeds/videos.xml?channel_id=${channelId}`);
  if (!response.ok) throw new YouTubeError(`YouTube's feed didn't answer (${response.status}). Try again in a minute.`);
  const xml = await response.text();
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].flatMap(([, entry]) => {
    const id = /<yt:videoId>([^<]+)<\/yt:videoId>/.exec(entry)?.[1]?.trim() ?? "";
    if (!VIDEO_ID.test(id)) return [];
    return [
      {
        id,
        title: decode(/<title>([\s\S]*?)<\/title>/.exec(entry)?.[1] ?? "").trim(),
        publishedAt: kathmanduDate(/<published>([^<]+)<\/published>/.exec(entry)?.[1] ?? ""),
        description: decode(/<media:description>([\s\S]*?)<\/media:description>/.exec(entry)?.[1] ?? "").trim(),
      },
    ];
  });
}
