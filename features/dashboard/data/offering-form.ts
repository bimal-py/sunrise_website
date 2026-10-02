import "server-only";
import type { ContentSection, Faq, OfferingIcon } from "@/shared/domain/offering";
import { OFFERING_ICONS } from "@/shared/domain/offering";
import type { ImageAsset } from "@/shared/domain/image";
import { bool, image, int, raw, str } from "./form";
import { SLUG_PATTERN } from "./slugs";

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

export type OfferingValues = {
  name: string;
  name_ne: string;
  icon: OfferingIcon;
  summary: string;
  intro: string[];
  sections: ContentSection[];
  faqs: Faq[];
  inquiry: string;
  service_type: string;
  featured: boolean;
  published: boolean;
  sort_order: number;
  og_image: ImageAsset | null;
  seo_title: string;
  seo_description: string;
};

/** The fields services and prints share, read from the editor and checked. */
export function readOffering(formData: FormData): { values: OfferingValues; slugInput: string; problems: string[] } {
  const icon = str(formData, "icon", 40) as OfferingIcon;
  const values: OfferingValues = {
    name: str(formData, "name", 160),
    name_ne: str(formData, "name_ne", 160),
    icon: OFFERING_ICONS.includes(icon) ? icon : "Camera",
    summary: str(formData, "summary", 400),
    intro: paragraphs(formData, "intro"),
    sections: readSections(formData),
    faqs: readFaqs(formData),
    // Kept as typed: messages often end in "Our date is: " for the client to finish.
    inquiry: raw(formData, "inquiry", 600),
    service_type: str(formData, "service_type", 120),
    featured: bool(formData, "featured"),
    published: bool(formData, "published"),
    sort_order: int(formData, "sort_order", 0),
    og_image: image(formData, "og_image"),
    seo_title: str(formData, "seo_title", 120),
    seo_description: str(formData, "seo_description", 300),
  };
  const slugInput = str(formData, "slug", 120).toLowerCase();
  const problems: string[] = [];
  if (!values.name) problems.push("Give it a name.");
  if (!values.summary) problems.push("Add a one-sentence summary (cards and search results use it).");
  if (slugInput && !SLUG_PATTERN.test(slugInput)) problems.push("The address may only use lowercase letters, digits and single hyphens.");
  return { values, slugInput, problems };
}
