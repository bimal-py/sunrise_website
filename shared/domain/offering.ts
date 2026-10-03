import type { ImageAsset } from "@/shared/domain/image";

/**
 * What services (weddings, pasni, portraits…) and prints (albums, frames…) have
 * in common: a named offering with a detail page, written content and an
 * inquiry. Each feature extends it with its own fields.
 */

/**
 * Lucide icons an offering can use (the dashboard's icon picker); resolved in
 * shared/components/content/offering-icon.tsx. Keep in step with the database check
 * (supabase/migrations/0002_more_offering_icons.sql).
 */
export const OFFERING_ICONS = [
  "Heart", "Clapperboard", "Flower2", "Flame", "Users", "IdCard", "PartyPopper", "BookHeart",
  "Frame", "Image", "Printer", "BookImage", "Camera", "Aperture", "Film", "Video",
  "Baby", "Gift", "Music", "Drum", "Cake", "Gem", "Crown", "HandHeart",
  "Images", "Album", "Landmark", "GraduationCap", "Mountain", "Sunrise", "ScanFace", "Smile",
] as const;

export type OfferingIcon = (typeof OFFERING_ICONS)[number];

/** A block of the detail page: an H2 with a paragraph and/or a list. */
export type ContentSection = {
  heading: string;
  body?: string;
  items?: string[];
};

export type Faq = { question: string; answer: string };

export type Offering = {
  slug: string;
  name: string;
  /** Nepali name, shown under the English one. */
  nameNe: string;
  icon: OfferingIcon;
  /** An icon chosen in the dashboard (cleaned SVG markup, drawn as a mask); wins over `icon` when set. */
  iconSvg?: string | null;
  /** One sentence: cards, meta description. */
  summary: string;
  /** Opening paragraphs of the detail page. */
  intro: string[];
  sections: ContentSection[];
  faqs: Faq[];
  /** Pre-filled WhatsApp message for this offering's "Ask on WhatsApp" button. */
  inquiry: string;
  /** schema.org serviceType. */
  serviceType: string;
  /** Dashboard SEO overrides; empty = the generated title and summary. */
  seoTitle?: string;
  seoDescription?: string;
  /** 1200×630 share image (else the page's photo, else the studio's). */
  ogImage?: ImageAsset | null;
  /** When the page last changed (sitemap lastmod). */
  updatedAt?: string | null;
};
