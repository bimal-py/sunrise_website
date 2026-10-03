import "server-only";
import { safeFetch, SafeFetchError } from "@/lib/net/safe-fetch";

/**
 * Icons chosen in the dashboard (Iconify search, or a pasted link to an SVG) are fetched and
 * cleaned on the server when a form is saved, and stored as markup (`icon_svg`) next to what
 * was chosen (`icon_source`). The site draws them as a CSS mask (shared/components/ui/
 * mask-icon.tsx), so they take the text colour and no script in them could ever run; the
 * cleaning below is a second wall, and keeps what's stored small and predictable.
 */

/** An Iconify icon id: "prefix:name", e.g. "mdi:camera". */
export const ICONIFY_ID = /^[a-z0-9-]+:[a-z0-9-]+$/;
const ICONIFY_API = "https://api.iconify.design";
/** What a pasted link may return. */
const MAX_LINK_BYTES = 100_000;
/** What the sanitiser reads. */
const MAX_INPUT = 100_000;
/** What's stored (the database checks icon_svg <= 20000 characters). */
export const MAX_ICON_SVG = 20_000;
/** Media types an SVG file is served under (servers vary); the markup itself is checked afterwards. */
const SVG_TYPES = /^(image\/svg\+xml|text\/xml|application\/xml|text\/plain|application\/octet-stream|binary\/octet-stream|)$/;

export type IconSource = { kind: "iconify"; id: string; prefix: string; name: string } | { kind: "url"; url: string };
type ParsedSource = IconSource | { kind: "empty" } | { kind: "invalid"; error: string };

function iconify(id: string): IconSource {
  const [prefix, name] = id.split(":");
  return { kind: "iconify", id, prefix, name };
}

/**
 * What the owner typed or picked: an Iconify id ("mdi:camera", any case), a link to an icon on
 * Iconify (api.iconify.design, icon-sets.iconify.design, icones.js.org: turned into its id), or
 * any other https link (expected to be an SVG).
 */
export function parseIconSource(raw: string): ParsedSource {
  const text = String(raw ?? "").trim();
  if (!text) return { kind: "empty" };
  if (text.length > 500) return { kind: "invalid", error: "That's too long for an icon id or link." };
  if (ICONIFY_ID.test(text.toLowerCase())) return iconify(text.toLowerCase());
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { kind: "invalid", error: "Use an icon id like “mdi:camera” (search above), or an https:// link to an SVG icon." };
  }
  if (url.protocol !== "https:") return { kind: "invalid", error: "Use a link that starts with https://" };
  const host = url.hostname.toLowerCase();
  if (host === "api.iconify.design") {
    const match = /^\/([a-z0-9-]+)(?:\/|:)([a-z0-9-]+)\.svg$/i.exec(url.pathname);
    if (match) return iconify(`${match[1]}:${match[2]}`.toLowerCase());
  }
  if (host === "icon-sets.iconify.design") {
    const match = /^\/([a-z0-9-]+)\/([a-z0-9-]+)\/?$/i.exec(url.pathname);
    if (match) return iconify(`${match[1]}:${match[2]}`.toLowerCase());
  }
  const param = url.searchParams.get("icon")?.toLowerCase();
  if ((host === "icones.js.org" || host === "icon-sets.iconify.design") && param && ICONIFY_ID.test(param)) return iconify(param);
  return { kind: "url", url: url.toString() };
}

// ---------------------------------------------------------------------------------------------
// Sanitising
// ---------------------------------------------------------------------------------------------

/** Elements kept (lowercase → the spelling written out). */
const ELEMENTS = new Map(
  ["svg", "g", "path", "circle", "ellipse", "line", "polyline", "polygon", "rect", "defs", "clipPath", "mask", "linearGradient", "radialGradient", "stop", "use", "symbol"].map(
    (name) => [name.toLowerCase(), name],
  ),
);
/** Elements dropped together with everything inside them. */
const DROP_WITH_CONTENT = new Set([
  "title",
  "desc",
  "metadata",
  "style",
  "script",
  "foreignobject",
  "image",
  "a",
  "text",
  "switch",
  "filter",
  "pattern",
  "marker",
  "iframe",
  "video",
  "audio",
  "canvas",
  "font",
  "font-face",
  "handler",
  "listener",
  "cursor",
  "view",
]);
/** Shapes: an icon must draw at least one. */
const SHAPES = new Set(["path", "circle", "ellipse", "line", "polyline", "polygon", "rect", "use"]);
/** Containers whose content is drawn by reference; nothing inside them may reference again. */
const REFERENCED = new Set(["mask", "clipPath", "symbol"]);
/** Animated icons are refused: removing the animation can leave a shape half drawn. */
const ANIMATION = /<(animate|animateTransform|animateMotion|set|discard)\b/i;

/** Attributes kept (lowercase → the spelling written out). `xlink:href` is kept as `href`. */
const ATTRIBUTES = new Map(
  [
    "id",
    "d",
    "fill",
    "fill-rule",
    "fill-opacity",
    "clip-rule",
    "clip-path",
    "mask",
    "stroke",
    "stroke-width",
    "stroke-linecap",
    "stroke-linejoin",
    "stroke-miterlimit",
    "stroke-dasharray",
    "stroke-dashoffset",
    "stroke-opacity",
    "opacity",
    "transform",
    "cx",
    "cy",
    "r",
    "rx",
    "ry",
    "x",
    "y",
    "x1",
    "y1",
    "x2",
    "y2",
    "width",
    "height",
    "points",
    "pathLength",
    "offset",
    "stop-color",
    "stop-opacity",
    "gradientUnits",
    "gradientTransform",
    "maskUnits",
    "maskContentUnits",
    "clipPathUnits",
    "fx",
    "fy",
    "fr",
    "spreadMethod",
    "href",
    "viewBox",
    "preserveAspectRatio",
    "color",
    "display",
    "visibility",
    "vector-effect",
    "paint-order",
    "shape-rendering",
    "mask-type",
  ].map((name) => [name.toLowerCase(), name]),
);
/** Attributes of the outer <svg> carried over (the rest of it is rebuilt). */
const ROOT_ATTRIBUTES = new Set([
  "fill",
  "fill-rule",
  "fill-opacity",
  "clip-rule",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-opacity",
  "opacity",
  "color",
]);
const LOCAL_REF = /^#[A-Za-z_][\w.:-]{0,63}$/;
const LOCAL_URL = /^url\(\s*(['"]?)#([A-Za-z_][\w.:-]{0,63})\1\s*\)$/i;
const MAX_REFERENCES = 48;

const NAMED_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

/** Decodes XML character references, so nothing can hide inside them. Null for anything else after "&". */
function decodeEntities(value: string): string | null {
  let ok = true;
  const decoded = value.replace(/&([^;&\s]{1,12});|&/g, (_match, body: string | undefined) => {
    if (body === undefined) {
      ok = false;
      return "";
    }
    let code = NaN;
    if (/^#x[0-9a-f]{1,6}$/i.test(body)) code = parseInt(body.slice(2), 16);
    else if (/^#\d{1,7}$/.test(body)) code = parseInt(body.slice(1), 10);
    else if (body in NAMED_ENTITIES) return NAMED_ENTITIES[body];
    if (!Number.isInteger(code) || code < 1 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) {
      ok = false;
      return "";
    }
    return String.fromCodePoint(code);
  });
  return ok ? decoded : null;
}

function withoutControlCharacters(value: string): string {
  let out = "";
  for (const char of value) {
    const code = char.charCodeAt(0);
    out += code < 32 || code === 127 ? " " : char;
  }
  return out;
}

const escapeAttribute = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type CleanValue = { value: string; reference: string | null };

/** An attribute value made safe, the local id it points at (url(#x), href="#x"), or null to drop it. */
function cleanValue(attribute: string, raw: string): CleanValue | null {
  if (raw.length > 16_000) return null;
  const decoded = decodeEntities(raw);
  if (decoded === null) return null;
  const value = withoutControlCharacters(decoded).trim();
  if (/[<>]/.test(value)) return null;
  const squashed = value.toLowerCase().replace(/\s+/g, "");
  if (/javascript:|vbscript:|data:|expression\(|@import|behavior:|-moz-binding/.test(squashed)) return null;
  if (attribute === "href") return LOCAL_REF.test(value) ? { value, reference: value.slice(1) } : null;
  if (attribute === "id") return /^[A-Za-z_][\w.:-]{0,63}$/.test(value) ? { value, reference: null } : null;
  if (squashed.includes("url(")) {
    const match = LOCAL_URL.exec(value);
    return match ? { value: `url(#${match[2]})`, reference: match[2] } : null;
  }
  return { value, reference: null };
}

/** Attribute name/value pairs of a tag (linear time; an unterminated quote ends the list). */
function parseAttributes(text: string): [string, string][] {
  const out: [string, string][] = [];
  const space = /\s/;
  let i = 0;
  while (i < text.length) {
    while (i < text.length && space.test(text[i])) i++;
    if (i >= text.length) break;
    let j = i;
    while (j < text.length && !/[\s=/>"']/.test(text[j])) j++;
    if (j === i) {
      i++;
      continue;
    }
    const name = text.slice(i, j);
    i = j;
    while (i < text.length && space.test(text[i])) i++;
    if (text[i] !== "=") {
      out.push([name, ""]);
      continue;
    }
    i++;
    while (i < text.length && space.test(text[i])) i++;
    const quote = text[i];
    if (quote === '"' || quote === "'") {
      const close = text.indexOf(quote, i + 1);
      if (close === -1) break;
      out.push([name, text.slice(i + 1, close)]);
      i = close + 1;
    } else {
      let k = i;
      while (k < text.length && !/[\s>]/.test(text[k])) k++;
      out.push([name, text.slice(i, k)]);
      i = k;
    }
  }
  return out;
}

function viewBoxOf(attributes: Map<string, string>): string | null {
  const box = (attributes.get("viewbox") ?? "").trim().split(/[\s,]+/).map(Number);
  if (box.length === 4 && box.every(Number.isFinite) && box[2] > 0 && box[3] > 0) return box.join(" ");
  const width = attributes.get("width") ?? "";
  const height = attributes.get("height") ?? "";
  const w = parseFloat(width);
  const h = parseFloat(height);
  if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0 && !/em|%|ex|vw|vh/i.test(`${width}${height}`)) return `0 0 ${w} ${h}`;
  return null;
}

/**
 * Where the tag starting at `lt` ends: its ">" (quotes respected, so a ">" inside a value
 * doesn't end it), a "<" that shows it wasn't a tag, or nothing (cut off). Linear time: every
 * character is looked at once, quoted values are jumped over.
 */
function tagEnd(input: string, lt: number): { kind: "end" | "stray"; at: number } | { kind: "truncated" } {
  let i = lt + 1;
  while (i < input.length) {
    const char = input[i];
    if (char === '"' || char === "'") {
      const close = input.indexOf(char, i + 1);
      if (close === -1) return { kind: "truncated" };
      i = close + 1;
      continue;
    }
    if (char === ">") return { kind: "end", at: i };
    if (char === "<") return { kind: "stray", at: i };
    i++;
  }
  return { kind: "truncated" };
}

type Open = { name: string; id: string | null; hasUse: boolean };

export type SanitizeResult = { ok: true; svg: string } | { ok: false; error: string };

/**
 * Rebuilds an SVG icon from an allow-list: only the elements and attributes above survive,
 * every value is decoded and checked, references must be local (#id), and nothing that could
 * load, run or style anything (scripts, foreignObject, images, <style>, style="", event
 * handlers, external links, comments, DOCTYPE/entities) gets through. Refuses animated icons
 * and icons whose references could multiply into a huge drawing. Never throws.
 */
export function sanitizeSvg(input: string): SanitizeResult {
  if (typeof input !== "string" || !input.trim()) return { ok: false, error: "That link didn't return an icon." };
  if (input.length > MAX_INPUT) return { ok: false, error: "That icon file is too big (over 100 KB). Pick a simpler icon." };
  if (/<!DOCTYPE|<!ENTITY/i.test(input)) return { ok: false, error: "That file isn't a plain SVG icon." };
  if (ANIMATION.test(input)) return { ok: false, error: "That icon is animated. Pick a still one." };

  const out: string[] = [];
  const stack: Open[] = [];
  const idsWithUse = new Set<string>();
  const useTargets: string[] = [];
  let root: Map<string, string> | null = null;
  let skipName = "";
  let skipDepth = 0;
  let referencedDepth = 0; // > 0 while inside a mask, clipPath or symbol
  let shapes = 0;
  let references = 0;

  let i = 0;
  while (i < input.length) {
    const lt = input.indexOf("<", i);
    if (lt === -1) break;
    if (input.startsWith("<!--", lt) || input.startsWith("<?", lt) || input.startsWith("<![CDATA[", lt)) {
      const [close, length] = input.startsWith("<!--", lt) ? ["-->", 3] : input.startsWith("<?", lt) ? ["?>", 2] : ["]]>", 3];
      const end = input.indexOf(close, lt + 2);
      if (end === -1) return { ok: false, error: "That file isn't a complete SVG icon." };
      i = end + length;
      continue;
    }
    if (input.startsWith("<!", lt)) return { ok: false, error: "That file isn't a plain SVG icon." };
    const end = tagEnd(input, lt);
    if (end.kind === "stray") {
      i = end.at; // a "<" that wasn't a tag: skipped
      continue;
    }
    if (end.kind === "truncated") break; // a cut-off tag: nothing after it is read
    const token = input.slice(lt, end.at + 1);
    i = end.at + 1;

    const head = /^<(\/?)([A-Za-z][\w:.-]*)/.exec(token);
    if (!head) continue;
    const closing = head[1] === "/";
    const lower = head[2].toLowerCase().replace(/^svg:/, "");
    const selfClosing = !closing && token.endsWith("/>");

    if (skipDepth > 0) {
      if (lower === skipName) skipDepth += closing ? -1 : selfClosing ? 0 : 1;
      continue;
    }
    if (DROP_WITH_CONTENT.has(lower)) {
      if (!closing && !selfClosing) {
        skipName = lower;
        skipDepth = 1;
      }
      continue;
    }
    const name = ELEMENTS.get(lower);
    if (!name) continue; // unknown elements vanish; their content is still read

    if (closing) {
      const top = stack[stack.length - 1];
      if (!top || top.name !== name) continue;
      stack.pop();
      if (top.id && top.hasUse) idsWithUse.add(top.id);
      if (REFERENCED.has(name)) referencedDepth--;
      if (stack.length > 0) out.push(`</${name}>`);
      continue;
    }

    const attributes = new Map<string, string>();
    const pointsAt: string[] = [];
    let refused = false;
    const body = token.slice(head[0].length, token.length - (selfClosing ? 2 : 1));
    for (const [rawName, rawValue] of parseAttributes(body)) {
      let key = rawName.toLowerCase();
      if (key === "xlink:href") key = "href";
      if (key.startsWith("on") || !ATTRIBUTES.has(key)) continue;
      const clean = cleanValue(key, rawValue);
      if (!clean) continue;
      if (clean.reference) {
        // mask/clip-path/use inside something drawn by reference could repeat without end.
        const multiplies = key === "mask" || key === "clip-path" || name === "use";
        if (multiplies && (referencedDepth > 0 || REFERENCED.has(name))) refused = true;
        pointsAt.push(clean.reference);
      }
      attributes.set(key, clean.value);
    }
    if (refused) return { ok: false, error: "That icon is built in a way that can't be used safely. Pick another one." };

    if (name === "svg") {
      if (root === null) {
        root = attributes;
        if (!selfClosing) stack.push({ name, id: null, hasUse: false });
      }
      continue; // a nested <svg> is dropped; what's inside it is still read
    }
    if (root === null) return { ok: false, error: "That file isn't an SVG icon." };
    if (stack.length > 64) return { ok: false, error: "That icon is too complicated. Pick a simpler one." };

    references += pointsAt.length;
    if (references > MAX_REFERENCES) return { ok: false, error: "That icon is too complicated. Pick a simpler one." };
    if (name === "use") {
      const target = attributes.get("href");
      if (!target) continue; // a <use> pointing nowhere draws nothing
      useTargets.push(target.slice(1));
      for (const open of stack) open.hasUse = true;
    }
    if (SHAPES.has(name)) shapes++;

    const kept = [...attributes].map(([key, value]) => ` ${ATTRIBUTES.get(key)}="${escapeAttribute(value)}"`).join("");
    out.push(`<${name}${kept}${selfClosing ? "/>" : ">"}`);
    if (!selfClosing) {
      stack.push({ name, id: attributes.get("id") ?? null, hasUse: false });
      if (REFERENCED.has(name)) referencedDepth++;
    }
  }

  if (root === null) return { ok: false, error: "That file isn't an SVG icon." };
  if (useTargets.some((target) => idsWithUse.has(target))) {
    return { ok: false, error: "That icon is built in a way that can't be used safely. Pick another one." };
  }
  const viewBox = viewBoxOf(root);
  if (!viewBox) return { ok: false, error: "That SVG has no size (viewBox), so it can't be drawn." };
  if (shapes === 0) return { ok: false, error: "That SVG has nothing to draw." };
  while (stack.length > 1) out.push(`</${stack.pop()!.name}>`);

  const rootKept = [...root]
    .filter(([key]) => ROOT_ATTRIBUTES.has(key))
    .map(([key, value]) => ` ${ATTRIBUTES.get(key)}="${escapeAttribute(value)}"`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"${rootKept}>${out.join("")}</svg>`;
  if (svg.length > MAX_ICON_SVG) return { ok: false, error: "That icon is too detailed (over 20 KB). Pick a simpler one." };
  return { ok: true, svg };
}

// ---------------------------------------------------------------------------------------------
// Resolving
// ---------------------------------------------------------------------------------------------

type IconifyIcon = { body?: string; left?: number; top?: number; width?: number; height?: number; rotate?: number; hFlip?: boolean; vFlip?: boolean };
type IconifyJson = {
  icons?: Record<string, IconifyIcon>;
  aliases?: Record<string, IconifyIcon & { parent?: string }>;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
};

const finite = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);

async function fetchIconify(prefix: string, name: string): Promise<string> {
  let data: IconifyJson;
  try {
    const { body } = await safeFetch(`${ICONIFY_API}/${prefix}.json?icons=${name}`, { maxBytes: 300_000, accept: /json/, acceptHeader: "application/json" });
    data = JSON.parse(body.toString("utf8")) as IconifyJson;
  } catch (error) {
    if (error instanceof SafeFetchError && error.status === 404) throw new Error(`There's no icon set called “${prefix}”. Search the icon library to find one.`);
    if (error instanceof SafeFetchError) throw new Error(`Couldn't reach the icon library: ${error.message}`);
    throw new Error("The icon library sent something unexpected. Try again in a moment.");
  }
  const icon = data.icons?.[name];
  if (icon && typeof icon.body === "string" && !icon.rotate && !icon.hFlip && !icon.vFlip) {
    const box = [finite(icon.left, finite(data.left, 0)), finite(icon.top, finite(data.top, 0)), finite(icon.width, finite(data.width, 16)), finite(icon.height, finite(data.height, 16))];
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.join(" ")}">${icon.body}</svg>`;
  }
  if (icon || data.aliases?.[name]) {
    // An alias or a flipped/rotated icon: let Iconify put it together.
    const { body } = await safeFetch(`${ICONIFY_API}/${prefix}/${name}.svg`, { maxBytes: MAX_LINK_BYTES, accept: /svg|xml/, acceptHeader: "image/svg+xml" });
    return body.toString("utf8");
  }
  throw new Error(`There's no icon called “${prefix}:${name}”. Search the icon library to find one.`);
}

/**
 * Fetches and cleans the icon `source` names: an Iconify id ("mdi:camera") or an https link to
 * an SVG (links to an icon on Iconify are turned into its id). Returns the clean markup and the
 * tidied source to store. Throws an Error whose message can be shown to the owner as it is.
 */
export async function resolveIconSvg(source: string): Promise<{ svg: string; source: string }> {
  const parsed = parseIconSource(source);
  if (parsed.kind === "empty") throw new Error("Pick an icon first.");
  if (parsed.kind === "invalid") throw new Error(parsed.error);

  let markup: string;
  let tidy: string;
  if (parsed.kind === "iconify") {
    markup = await fetchIconify(parsed.prefix, parsed.name);
    tidy = parsed.id;
  } else {
    let fetched;
    try {
      // SVG is served under several names; anything that's clearly something else is refused before downloading.
      fetched = await safeFetch(parsed.url, { maxBytes: MAX_LINK_BYTES, accept: SVG_TYPES, acceptHeader: "image/svg+xml,*/*;q=0.5" });
    } catch (error) {
      if (error instanceof SafeFetchError && error.contentType?.startsWith("image/")) {
        throw new Error("That link is a picture, not an SVG icon. Use a link to an .svg file, or search the icon library.");
      }
      throw new Error(error instanceof SafeFetchError ? error.message : "Couldn't download that icon.");
    }
    markup = fetched.body.toString("utf8");
    if (!/<svg[\s>]/i.test(markup)) throw new Error("That link didn't return an SVG icon.");
    tidy = parsed.url;
  }
  const clean = sanitizeSvg(markup);
  if (!clean.ok) throw new Error(clean.error);
  return { svg: clean.svg, source: tidy };
}

export type IconFieldResult = { ok: true; source: string; svg: string | null } | { ok: false; error: string };

/**
 * For a form's icon field (IconPickerField submits `icon_source`): empty → no icon; the same
 * source as `current` → kept as it is (no fetch); anything else → resolved. Never throws.
 *
 *   const icon = await resolveIconField(str(formData, "icon_source"), { source: row.icon_source, svg: row.icon_svg });
 *   if (!icon.ok) return { status: "error", fieldErrors: { icon_source: icon.error } };
 *   // store icon.source in icon_source and icon.svg in icon_svg
 */
export async function resolveIconField(input: string, current?: { source: string; svg: string | null } | null): Promise<IconFieldResult> {
  const parsed = parseIconSource(input);
  if (parsed.kind === "empty") return { ok: true, source: "", svg: null };
  if (parsed.kind === "invalid") return { ok: false, error: parsed.error };
  const tidy = parsed.kind === "iconify" ? parsed.id : parsed.url;
  if (current?.svg && (current.source === tidy || current.source === String(input).trim())) return { ok: true, source: current.source, svg: current.svg };
  try {
    const { svg, source } = await resolveIconSvg(tidy);
    return { ok: true, source, svg };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Couldn't use that icon." };
  }
}
