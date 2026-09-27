/**
 * What services (weddings, pasni, portraits…) and prints (albums, frames…) have
 * in common: a named offering with a detail page, written content and an
 * inquiry. Each feature extends it with its own fields.
 */

/** Lucide icon names used by offerings; resolved in shared/components/content/offering-icon.tsx. */
export type OfferingIcon =
  | "Heart"
  | "Clapperboard"
  | "Flower2"
  | "Flame"
  | "Users"
  | "IdCard"
  | "PartyPopper"
  | "BookHeart"
  | "Frame"
  | "Image"
  | "Printer"
  | "BookImage";

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
};
