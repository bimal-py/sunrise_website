import { routes } from "@/lib/routes";
import type { Json, PageKey } from "@/lib/supabase/types";

/**
 * The fixed pages' editable words (dashboard → Pages, stored in `pages.content`).
 * Each field's `default` is the page's own wording in code: the site shows it while
 * nothing is saved, and a save that leaves a field as the default stores "", so an
 * untouched field keeps following the code. Everything else on a page (its layout,
 * the home scenes' devices, lists and links) stays in code.
 */

/** One line, a few lines (a textarea), or a line in Nepali (edited and shown in lang="ne"). */
export type PageFieldKind = "text" | "textarea" | "ne";

/** The studio's names (Settings), for the few defaults built from them. */
export type StudioNames = { name: string; nameNe: string };

/** Today's words, or words made from the studio's name, so they follow a rename in Settings. */
export type FieldDefault = string | ((studio: StudioNames) => string);

export type PageField = {
  /** Key in `pages.content`. */
  name: string;
  label: string;
  kind: PageFieldKind;
  hint?: string;
  default: FieldDefault;
  /** The editor groups fields under this heading, in order. */
  group: string;
  /** Character cap: checked on save, and the input's maxLength. */
  max?: number;
  /** Half width in the editor (a title beside its Nepali line). */
  half?: boolean;
  /** Starts a new row in the editor (after a half-width field that stands alone). */
  newRow?: boolean;
  rows?: number;
};

export type PageDefinition = {
  label: string;
  /** The public page. */
  path: string;
  /** What the editor changes there, for the list. */
  summary: string;
  fields: readonly PageField[];
  /** A free-text body (About's introduction): plain paragraphs separated by blank lines, not MDX. */
  hasBody: boolean;
  body?: { label: string; hint: string; default: FieldDefault; max: number; rows: number };
  /**
   * The page's built-in search title and description (its route's generateMetadata), shown
   * greyed in the empty SEO fields. null: the page's search settings live elsewhere (home: Settings).
   */
  seo: { title: string; description: string } | null;
  /** Shown at the top of the editor. */
  note?: string;
};

const MAX: Record<PageFieldKind, number> = { text: 120, ne: 160, textarea: 600 };
export const SEO_TITLE_MAX = 120;
export const SEO_DESCRIPTION_MAX = 300;

const HEADER = "Header";

/** An index page's centred or left header: eyebrow, H1, the Nepali line, the lede. */
function header(defaults: { eyebrow: string; title: string; titleNe: string; lede: string }) {
  return [
    { name: "eyebrow", label: "Label above the title", kind: "text", group: HEADER, default: defaults.eyebrow, max: 60, half: true, hint: "The small gold word or two." },
    { name: "title", label: "Title", kind: "text", group: HEADER, default: defaults.title, half: true, newRow: true, hint: "The page's main heading." },
    { name: "titleNe", label: "Title in Nepali", kind: "ne", group: HEADER, default: defaults.titleNe, half: true, hint: "The line under the title." },
    { name: "lede", label: "Introduction", kind: "textarea", group: HEADER, default: defaults.lede, max: 400, rows: 3, hint: "A sentence or two under the title." },
  ] as const;
}

/** A home scene's title card: its title and the line under it (scene numbers and devices stay in code). */
function scene<const N extends string>(id: N, group: string, title: string, lede: string, hint?: string) {
  return [
    { name: `${id}Title`, label: "Title", kind: "text", group, default: title, hint },
    { name: `${id}Lede`, label: "Line under the title", kind: "textarea", group, default: lede, max: 300, rows: 2, hint: lede ? undefined : "Optional: this scene has no line by default." },
  ] as const;
}

const ORDER = "How to order";

/**
 * Every fixed page, in the site's nav order (then Privacy). `default`s are copied word for
 * word from the views; keep them in step when a view's wording changes in code.
 */
export const PAGE_DEFINITIONS = {
  home: {
    label: "Home",
    path: routes.home(),
    summary: "The scenes' titles and the lines under them",
    note: "The big headline and the Nepali line under it are in Settings → Studio.",
    fields: [
      ...scene("films", "Films scene", "Now showing", "Weddings and ceremonies we've filmed across Syangja, frame by frame. Swipe through the reel.", "Above the film strip."),
      ...scene("services", "Services scene", "The shot list", "What we photograph and film. Every shoot starts with a list like this, made with you."),
      ...scene("prints", "Prints scene", "From the darkroom", "Photos shouldn't stay on a phone. Albums, frames and canvas, printed in our studio."),
      ...scene("reviews", "Reviews scene", "Kind words", "From the families we've photographed, in their own words.", "This scene appears once the first real review is published."),
      ...scene("about", "About scene", "Behind the lens", ""),
      ...scene("contact", "Contact scene", "Book a date", "Your day, our camera. Here's how to reach us."),
    ],
    hasBody: false,
    seo: null,
  },
  films: {
    label: "Films",
    path: routes.films(),
    summary: "The header above the films",
    fields: header({
      eyebrow: "Films",
      title: "Wedding and ceremony films",
      titleNe: "विवाह तथा संस्कारका भिडियो",
      lede: "Weddings, pasni, bratabandha and cultural programmes we've filmed across Syangja. New films go up on our YouTube channel first.",
    }),
    hasBody: false,
    seo: {
      title: "Films: weddings, pasni, bratabandha and more",
      description: "Wedding films, ceremony films and cultural programmes filmed by Sunrise Photo Studio across Syangja, Nepal.",
    },
  },
  services: {
    label: "Services",
    path: routes.services(),
    summary: "The header above the services",
    fields: header({
      eyebrow: "Services",
      title: "What we photograph and film",
      titleNe: "हाम्रा सेवाहरू",
      lede: "Weddings, family ceremonies, portraits and events across Syangja, plus passport and ID photos in the studio. Every booking starts with a message: tell us the date and what you need.",
    }),
    hasBody: false,
    seo: {
      title: "Services: wedding photos, films, pasni and portraits",
      description:
        "Wedding photography and films, pre-wedding shoots, pasni and bratabandha, studio portraits, events and passport photos in Arjunchaupari, Syangja.",
    },
  },
  prints: {
    label: "Prints",
    path: routes.prints(),
    summary: "The header and the three “How to order” steps",
    fields: [
      ...header({
        eyebrow: "Prints and albums",
        title: "Albums, frames and prints",
        titleNe: "एल्बम, फ्रेम र फोटो प्रिन्ट",
        lede: "Premium wedding albums, framed portraits, canvas prints, photo books and everyday prints, from our photos or yours.",
      }),
      { name: "step1Title", label: "Step 1: title", kind: "text", group: ORDER, default: "Send your photos" },
      { name: "step1Body", label: "Step 1: text", kind: "textarea", group: ORDER, default: "On WhatsApp as a document (so they aren't compressed), or bring them on a pen drive or memory card.", max: 300, rows: 2 },
      { name: "step2Title", label: "Step 2: title", kind: "text", group: ORDER, default: "Choose size and finish" },
      { name: "step2Body", label: "Step 2: text", kind: "textarea", group: ORDER, default: "Tell us where it will go and we'll suggest a size, a frame or a canvas, and give you a quote.", max: 300, rows: 2 },
      { name: "step3Title", label: "Step 3: title", kind: "text", group: ORDER, default: "Collect it" },
      { name: "step3Body", label: "Step 3: text", kind: "textarea", group: ORDER, default: "We print and frame in the studio and let you know when it's ready.", max: 300, rows: 2 },
    ],
    hasBody: false,
    seo: {
      title: "Prints: premium albums, photo frames and canvas",
      description:
        "Premium wedding albums, photo frames, canvas prints, photo books and photo prints, designed and printed at Sunrise Photo Studio in Arjunchaupari, Syangja.",
    },
  },
  about: {
    label: "About",
    path: routes.about(),
    summary: "The header and the introduction",
    fields: [
      { name: "eyebrow", label: "Label above the title", kind: "text", group: HEADER, default: "About", max: 60, half: true, hint: "The small gold word or two." },
      { name: "title", label: "Title", kind: "text", group: HEADER, default: (studio: StudioNames) => `About ${studio.name}`, half: true, newRow: true, hint: "The original wording follows the studio's name in Settings." },
      { name: "titleNe", label: "Title in Nepali", kind: "ne", group: HEADER, default: (studio: StudioNames) => studio.nameNe, half: true, hint: "The original is the studio's Nepali name from Settings." },
    ],
    hasBody: true,
    body: {
      label: "Introduction",
      hint: "Plain paragraphs: leave an empty line between them. The first is shown a little larger, with the studio's name in bold when it starts with it. The sections below it (what we do, prints, films) are built from the site's content.",
      default: (studio: StudioNames) =>
        `${studio.name} is a photo and film studio in Arjunchaupari, Syangja. We photograph and film weddings, pasni, bratabandha, pujas and cultural programmes across the district, from Arjunchaupari to Panchamul, Walling and Tirasi, and we print what we shoot: albums, frames, canvas prints and everyday photos.\n\nMost of our work is for families: the days they'll want to see again, and relatives in Nepal and abroad will want to watch. That's why we film every ritual in order, make sure every side of the family gets its group photo, and turn the best pictures into things people keep on a shelf or a wall.`,
      max: 6000,
      rows: 12,
    },
    seo: {
      title: "About the studio",
      description:
        "Sunrise Photo Studio is a photo and film studio in Arjunchaupari, Syangja, covering weddings, pasni, bratabandha and family celebrations, with albums and prints made in the studio.",
    },
  },
  blogs: {
    label: "Blog",
    path: routes.blog(),
    summary: "The header above the guides",
    fields: header({
      eyebrow: "Blog",
      title: "Guides for your big days",
      titleNe: "तयारीका लागि सुझाव",
      lede: "Planning wedding photos and films, what to capture at a pasni or bratabandha, and choosing print sizes, frames and albums.",
    }),
    hasBody: false,
    seo: {
      title: "Blog: guides to wedding photos, ceremonies and prints",
      description: "Planning wedding photos and films in Nepal, what to capture at a pasni or bratabandha, and choosing print sizes, frames and albums.",
    },
  },
  contact: {
    label: "Contact",
    path: routes.contact(),
    summary: "The header, the visit note and the message checklist",
    fields: [
      ...header({
        eyebrow: "Contact",
        title: "Book a date or ask a question",
        titleNe: "सम्पर्क गर्नुहोस्",
        lede: "WhatsApp is the quickest way to reach us. Tell us the occasion, the date and the place, and we'll reply with availability and a quote.",
      }),
      { name: "visitNote", label: "Note under the map link", kind: "textarea", group: "Visit the studio", default: "For portraits and passport photos, call before you come so we're ready for you.", max: 300, rows: 2 },
      {
        name: "include",
        label: "What to include in your message",
        kind: "textarea",
        group: "Under the form",
        default: "The occasion, and the date (or the month)\nThe venue or village, for both sides of a wedding\nPhotos, a film, or both\nAny album, frame or print you have in mind",
        max: 800,
        rows: 5,
        hint: "One item per line.",
      },
    ],
    hasBody: false,
    seo: {
      title: "Contact and booking",
      description:
        "Book Sunrise Photo Studio for your wedding, pasni, bratabandha or portraits: WhatsApp, phone, email, and the studio's address in Arjunchaupari, Syangja.",
    },
  },
  merchandise: {
    label: "Merchandise",
    path: routes.merchandise(),
    summary: "The shop's header and lede",
    fields: [
      ...header({
        eyebrow: "Merchandise",
        title: "Merchandise",
        titleNe: "सामानहरू",
        lede: "Things you can order from the studio. Choose what you like and send us your order: we'll contact you to confirm it.",
      }),
    ],
    hasBody: false,
    seo: {
      title: "Merchandise from Sunrise Photo Studio",
      description: "Order products from Sunrise Photo Studio in Syangja: send your order online and the studio contacts you to confirm it.",
    },
  },
  privacy: {
    label: "Privacy",
    path: routes.privacy(),
    summary: "How it shows in search results (its words stay in code)",
    note: "The privacy notice is a promise about what the site actually does with visitors' details (the enquiry form, the film player, hosting), so its words change only together with that code: ask the developer when something changes. Here you can set how the page appears in search results and link previews.",
    fields: [],
    hasBody: false,
    seo: {
      title: "Privacy",
      description: "What the Sunrise Photo Studio website collects (very little) and how the enquiry form and film player work.",
    },
  },
} as const satisfies Record<PageKey, PageDefinition>;

/** The pages in list order. */
export const PAGE_KEYS = Object.keys(PAGE_DEFINITIONS) as PageKey[];

export function isPageKey(value: string): value is PageKey {
  return Object.hasOwn(PAGE_DEFINITIONS, value);
}

/** A page's definition, typed loosely (for code that handles any page). */
export function getPageDefinition(key: PageKey): PageDefinition {
  return PAGE_DEFINITIONS[key];
}

export function fieldMax(field: PageField): number {
  return field.max ?? MAX[field.kind];
}

/** A field's default; ones built from the studio's name need `studio`. */
export function fieldDefault(field: { default: FieldDefault }, studio?: StudioNames): string {
  if (typeof field.default === "string") return field.default;
  return studio ? field.default(studio) : "";
}

/** The saved text of a content field, or "" when nothing (or only spaces) is saved. */
export function savedText(content: Record<string, Json> | null | undefined, name: string): string {
  const value = content?.[name];
  return typeof value === "string" && value.trim() ? value : "";
}

type FieldName<K extends PageKey> = (typeof PAGE_DEFINITIONS)[K]["fields"][number]["name"];
export type PageCopy<K extends PageKey> = Record<FieldName<K>, string>;

/** The words a page shows: each field's saved text, or its default while nothing is saved. */
export function pageCopy<K extends PageKey>(key: K, content: Record<string, Json>, studio?: StudioNames): PageCopy<K> {
  const copy: Record<string, string> = {};
  for (const field of getPageDefinition(key).fields) copy[field.name] = savedText(content, field.name) || fieldDefault(field, studio);
  return copy as PageCopy<K>;
}

/** A page's body (About's introduction): the saved text, or the default. */
export function pageBody(key: PageKey, body: string, studio: StudioNames): string {
  const definition = getPageDefinition(key).body;
  return body.trim() ? body : definition ? fieldDefault(definition, studio) : "";
}

/** Lines tidied for storing: line breaks as \n, each line trimmed, at most one empty line in a row. */
export function tidyLines(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** A submitted field, tidied the way it's stored: textareas keep their lines, the rest is one line. */
export function cleanField(field: Pick<PageField, "kind">, value: string): string {
  return field.kind === "textarea" ? tidyLines(value) : value.replace(/\s+/g, " ").trim();
}

/** "a\n\nb" → ["a", "b"]: the body's paragraphs. */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/** One item per line → the items (a list field such as Contact's checklist). */
export function lineItems(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
