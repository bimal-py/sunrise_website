import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveIconField } from "@/lib/icons/iconify";
import type { Database } from "@/lib/supabase/types";
import type { ImageAsset } from "@/shared/domain/image";
import { OFFERING_ICONS, type ContentSection, type Faq, type OfferingIcon } from "@/shared/domain/offering";
import { bool, int, raw, str } from "./form";
import { imageFromForm } from "./image-input";
import { SLUG_PATTERN } from "./slugs";

type Db = SupabaseClient<Database>;

function parseJson(formData: FormData, key: string): unknown[] {
  try {
    const value = JSON.parse(String(formData.get(key) ?? "[]"));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

export function readSections(formData: FormData, key = "sections"): ContentSection[] {
  return parseJson(formData, key)
    .map((row) => {
      const r = row as Record<string, unknown>;
      const items = Array.isArray(r.items) ? r.items.map((item) => text(item, 400)).filter(Boolean).slice(0, 30) : [];
      const section: ContentSection = { heading: text(r.heading, 160) };
      const body = text(r.body, 3000);
      if (body) section.body = body;
      if (items.length) section.items = items;
      return section;
    })
    .filter((section) => section.heading && (section.body || section.items?.length))
    .slice(0, 20);
}

export function readFaqs(formData: FormData, key = "faqs"): Faq[] {
  return parseJson(formData, key)
    .map((row) => ({ question: text((row as Faq).question, 300), answer: text((row as Faq).answer, 2000) }))
    .filter((faq) => faq.question && faq.answer)
    .slice(0, 20);
}

export function readPairs(formData: FormData, key: string): { label: string; detail: string }[] {
  return parseJson(formData, key)
    .map((row) => ({ label: text((row as { label: unknown }).label, 120), detail: text((row as { detail: unknown }).detail, 400) }))
    .filter((pair) => pair.label)
    .slice(0, 30);
}

/** Paragraphs separated by blank lines. */
export function paragraphs(formData: FormData, key: string): string[] {
  return String(formData.get(key) ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 10);
}

/** The text fields services and prints share (the icon and the share image are read separately: they need the database or a fetch). */
export type OfferingValues = {
  name: string;
  name_ne: string;
  summary: string;
  intro: string[];
  sections: ContentSection[];
  faqs: Faq[];
  inquiry: string;
  service_type: string;
  featured: boolean;
  published: boolean;
  sort_order: number;
  seo_title: string;
  seo_description: string;
};

/** The fields services and prints share, read from the editor and checked. */
export function readOffering(formData: FormData): { values: OfferingValues; slugInput: string; problems: string[] } {
  const status = str(formData, "status", 20);
  const values: OfferingValues = {
    name: str(formData, "name", 160),
    name_ne: str(formData, "name_ne", 160),
    summary: str(formData, "summary", 400),
    intro: paragraphs(formData, "intro"),
    sections: readSections(formData),
    faqs: readFaqs(formData),
    // Kept as typed: messages often end in "Our date is: " for the client to finish.
    inquiry: raw(formData, "inquiry", 600),
    service_type: str(formData, "service_type", 120),
    featured: bool(formData, "featured"),
    // The Status select ("published" / "draft"); an older form sent a "published" checkbox.
    published: status ? status === "published" : bool(formData, "published"),
    sort_order: Math.max(-100000, Math.min(100000, int(formData, "sort_order", 0))),
    seo_title: str(formData, "seo_title", 120),
    seo_description: str(formData, "seo_description", 300),
  };
  const slugInput = str(formData, "slug", 120).toLowerCase();
  const problems: string[] = [];
  if (!values.name) problems.push("Give it a name.");
  if (!values.summary) problems.push("Add a one-sentence summary (cards and search results use it).");
  if (slugInput && !SLUG_PATTERN.test(slugInput)) problems.push("The slug may only use lowercase letters, digits and single hyphens (e.g. wedding-photography).");
  return { values, slugInput, problems };
}

// ---------------------------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------------------------

/** "Flower2" → "flower-2", "PartyPopper" → "party-popper": the lucide names as Iconify spells them. */
const kebab = (name: string) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([a-zA-Z])(\d)/g, "$1-$2")
    .toLowerCase();

/** The built-in icon an Iconify id stands for, when it is one ("lucide:flower-2" → "Flower2"), else null. */
export function builtInIconFor(source: string): OfferingIcon | null {
  const match = /^lucide:([a-z0-9-]+)$/.exec(source.trim().toLowerCase());
  if (!match) return null;
  return OFFERING_ICONS.find((icon) => kebab(icon) === match[1]) ?? null;
}

export type OfferingIconValues = { icon: OfferingIcon; icon_source: string; icon_svg: string | null };

/**
 * The icon field (IconPickerField sends `icon_source`): fetched and cleaned on the server
 * (never the browser's SVG), unchanged sources kept without a fetch. `icon`, the lucide name
 * older code still reads, follows when the pick is one of the built-in lucide icons and
 * otherwise stays as it was, so it's always a valid name.
 */
export async function readOfferingIcon(
  formData: FormData,
  current: { icon: OfferingIcon; icon_source: string; icon_svg: string | null } | null,
  /** The built-in icon a new row starts with. */
  initial: OfferingIcon = "Camera",
): Promise<{ ok: true; values: OfferingIconValues } | { ok: false; error: string }> {
  const input = str(formData, "icon_source", 500);
  const resolved = await resolveIconField(input, current ? { source: current.icon_source, svg: current.icon_svg } : null);
  if (!resolved.ok) return { ok: false, error: `Icon: ${resolved.error}` };
  const fallback: OfferingIcon = current?.icon && OFFERING_ICONS.includes(current.icon) ? current.icon : initial;
  return { ok: true, values: { icon: builtInIconFor(resolved.source) ?? fallback, icon_source: resolved.source, icon_svg: resolved.svg } };
}

// ---------------------------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------------------------

/**
 * A photo field (ImageUrlField sends the chosen photo's JSON): read back from the photo
 * library, never trusted from the browser. The photo already saved is kept as it is when it
 * wasn't changed (some older photos predate the library). Empty = no photo.
 */
export async function readImageField(
  db: Db,
  formData: FormData,
  key: string,
  current: ImageAsset | null,
): Promise<{ ok: true; image: ImageAsset | null } | { ok: false; error: string }> {
  const value = String(formData.get(key) ?? "");
  if (!value) return { ok: true, image: null };
  let src = "";
  try {
    const parsed = JSON.parse(value) as { src?: unknown };
    src = typeof parsed?.src === "string" ? parsed.src : "";
  } catch {
    // Unreadable: refused below.
  }
  if (current && src && src === current.src) return { ok: true, image: current };
  const image = src ? await imageFromForm(db, formData, key) : null;
  if (image) return { ok: true, image };
  return { ok: false, error: "That photo isn't in the photo library. Choose it again with the photo button, or paste its link." };
}
