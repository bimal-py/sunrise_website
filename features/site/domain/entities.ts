import type { ImageAsset } from "@/shared/domain/image";

/** The person behind the studio, shown in the home page's "Behind the lens" scene. */
export type Founder = {
  name: string;
  nameNe?: string;
  /** "Founder & lead photographer". */
  role: string;
  /** Their own words, a sentence or two (never written for them). */
  quote?: string;
  /** A short third-person line about them: since when, what they shoot. Facts only. */
  bio?: string;
  /** A real portrait, portrait orientation, ≥ 800px wide (uploaded in the dashboard). */
  photo?: ImageAsset;
};

/**
 * Studio identity, contact details and site-wide SEO settings: edited in the dashboard
 * (Settings), stored in the `site_settings` row. `url`, `locale`, `timeZone` and `author`
 * come from code (lib/config/site.ts), not the database.
 */
export type SiteSettings = {
  name: string;
  /** The domain's longer form of the name; `alternateName` in structured data. */
  alternateName: string;
  /** The name in Nepali, shown under the wordmark and in the footer. */
  nameNe: string;
  /** The hero's H1 and the splash line. */
  tagline: string;
  /** The Nepali line under the hero's H1. */
  taglineNe: string;
  /** Default meta description; LocalBusiness description. */
  description: string;
  footerBlurb: string;
  /** "Behind the lens" text while no founder is set. */
  studioBlurb: string;
  /** The home page's <title> and the default for pages without one. */
  defaultTitle: string;
  url: string;
  locale: string;
  timeZone: string;
  author: { name: string; url: string };
  contact: {
    /** Shown as written; `phoneHref` is the tel: form. */
    phone: string;
    phoneHref: string;
    /** International form, digits only (wa.me links). Empty = no WhatsApp. */
    whatsapp: string;
    whatsappDisplay: string;
    email: string;
  };
  address: {
    street: string;
    locality: string;
    district: string;
    region: string;
    country: string;
    countryCode: string;
    postalCode: string;
    /** One line for the footer and contact page. */
    line: string;
    lineNe: string;
    mapsUrl: string;
    latitude: number | null;
    longitude: number | null;
  };
  /** Places the studio works in (structured data `areaServed`). */
  areaServed: string[];
  /** Profile URLs; empty strings are not shown. */
  social: { facebook: string; youtube: string; instagram: string; tiktok: string };
  youtubeChannelId: string;
  /** Null until the owner fills in the founder's name: the studio stands in. */
  founder: Founder | null;
  seo: {
    /** Share image for pages without their own (null = /brand/og-default.jpg). */
    ogImage: ImageAsset | null;
    googleVerification: string;
    bingVerification: string;
    indexNowKey: string;
  };
  /** Microsoft Clarity project id. Empty = no analytics. */
  clarityId: string;
};
