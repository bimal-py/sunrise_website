import type { SiteSettings } from "@/features/site/domain/entities";

/**
 * Facts that stay in code. Everything the studio can change (name, phone, address,
 * socials, founder, SEO) is edited in the dashboard and read with getSiteSettings()
 * (features/site/data/settings.repository.ts); `defaultSiteSettings` is the fallback
 * used when Supabase isn't configured, and the seed for the database row.
 */

/** Set NEXT_PUBLIC_SITE_URL in production; the fallback is the live domain. */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://sunrisedigitalphotostudio.com.np").replace(/\/$/, "");
export const siteLocale = "en_US";
/** Dates on the site are shown in the studio's time zone. */
export const siteTimeZone = "Asia/Kathmandu";
/** Who builds the site; credited (and linked) in the footer. */
export const siteAuthor = { name: "Bimal Khatri", url: "https://bimalkhatri.com.np" };

/** "+977 986-6060450" from "9779866060450" (Nepali numbers; anything else gets a plus). */
export function formatWhatsapp(digits: string): string {
  if (/^977\d{10}$/.test(digits)) return `+977 ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return digits ? `+${digits}` : "";
}

/** "tel:+9779846160675" from "+977 984-6160675". */
export function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : "";
}

/** WhatsApp chat link to `number` (digits only), optionally with a pre-filled message. */
export function whatsappUrl(number: string, message?: string): string {
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export const defaultSiteSettings: SiteSettings = {
  name: "Sunrise Photo Studio",
  alternateName: "Sunrise Digital Photo Studio",
  nameNe: "सनराइज फोटो स्टुडियो",
  tagline: "Photos and films for the days you'll want to relive",
  taglineNe: "तपाईंका खुसीका पलहरू, सधैंका लागि",
  description:
    "Sunrise Photo Studio in Arjunchaupari, Syangja photographs and films weddings, pasni, bratabandha and family celebrations, and prints premium albums, photo frames and canvas prints.",
  footerBlurb:
    "Weddings, pasni, bratabandha and family celebrations, photographed and filmed in Syangja. Albums, frames and prints made in the studio.",
  studioBlurb:
    "A photo and film studio in Arjunchaupari, Syangja. We photograph and film weddings, pasni, bratabandha and family celebrations across the district, and print what we shoot.",
  defaultTitle: "Sunrise Photo Studio: wedding photos, films and prints in Syangja",
  url: siteUrl,
  locale: siteLocale,
  timeZone: siteTimeZone,
  author: siteAuthor,
  contact: {
    phone: "+977 984-6160675",
    phoneHref: "tel:+9779846160675",
    whatsapp: "9779866060450",
    whatsappDisplay: "+977 986-6060450",
    email: "mahendrastha675@gmail.com",
  },
  address: {
    street: "Arjunchaupari Rural Municipality-5",
    locality: "Arjunchaupari",
    district: "Syangja",
    region: "Gandaki Province",
    country: "Nepal",
    countryCode: "NP",
    postalCode: "",
    line: "Arjunchaupari-5, Syangja, Nepal",
    lineNe: "अर्जुनचौपारी-५, स्याङ्जा",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Arjunchaupari%2C+Syangja%2C+Nepal",
    latitude: null,
    longitude: null,
  },
  areaServed: ["Arjunchaupari", "Panchamul", "Walling", "Syangja"],
  social: {
    facebook: "https://www.facebook.com/Sunrisephotostudio675",
    youtube: "https://www.youtube.com/@sunrisephotostudio3135",
    instagram: "",
    tiktok: "",
  },
  youtubeChannelId: "UCgLL5B9pQnV7fbme0wYgBUQ",
  founder: null,
  seo: { ogImage: null, googleVerification: "", bingVerification: "", indexNowKey: "" },
  clarityId: "",
};
