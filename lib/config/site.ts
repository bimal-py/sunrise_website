/**
 * Studio identity and contact details: the one place to change a phone number,
 * the address or a social link. Services, prints and films have their own data.
 */
export const siteConfig = {
  name: "Sunrise Photo Studio",
  /** The domain's longer form of the name; used as `alternateName` in structured data. */
  alternateName: "Sunrise Digital Photo Studio",
  /** The name in Nepali, shown under the wordmark and in the footer. */
  nameNe: "सनराइज फोटो स्टुडियो",
  tagline: "Photos and films for the days you'll want to relive.",
  description:
    "Sunrise Photo Studio in Arjunchaupari, Syangja photographs and films weddings, pasni, bratabandha and family celebrations, and prints premium albums, photo frames and canvas prints.",
  /** Set NEXT_PUBLIC_SITE_URL in production; the fallback is the live domain. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://sunrisedigitalphotostudio.com.np",
  locale: "en_US",
  /** Dates on the site are shown in the studio's time zone. */
  timeZone: "Asia/Kathmandu",

  contact: {
    /** Shown as written; `phoneHref` is the tel: form. */
    phone: "+977 984-6160675",
    phoneHref: "tel:+9779846160675",
    /** WhatsApp number in international form, digits only (wa.me links). */
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
    /** One line for the footer and contact page. */
    line: "Arjunchaupari-5, Syangja, Nepal",
    lineNe: "अर्जुनचौपारी-५, स्याङ्जा",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Arjunchaupari%2C+Syangja%2C+Nepal",
  },

  /** Places the studio has filmed in (from its YouTube uploads). */
  areaServed: ["Arjunchaupari", "Panchamul", "Walling", "Syangja"],

  social: {
    facebook: "https://www.facebook.com/Sunrisephotostudio675",
    youtube: "https://www.youtube.com/@sunrisephotostudio3135",
  },

  /** Who builds the site; credited (and linked) in the footer. */
  author: { name: "Bimal Khatri", url: "https://bimalkhatri.com.np" },
  /** Microsoft Clarity project id. Empty = no analytics (and SiteAnalytics renders nothing). */
  clarityId: "",
} as const;

/** WhatsApp chat link, optionally with a pre-filled message. */
export function whatsappUrl(message?: string): string {
  const base = `https://wa.me/${siteConfig.contact.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
