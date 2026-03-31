import groq from "groq";

import { fetchSanityOrFallback } from "@/core/sanity/client";

export const siteConfig = {
  name: "Sunrise Photo Digital Studio",
  shortName: "Sunrise Studio",
  domain: "sunrisedigitalphotostudio.com.np",
  url: "https://sunrisedigitalphotostudio.com.np",
  description:
    "Sunrise Photo Digital Studio is a Nepal-based wedding, portrait, event, and passport photo studio offering cinematic visuals, printed products, and inquiry-based bookings.",
  locale: "en_NP",
  phone: "+977-9800000000",
  email: "hello@sunrisedigitalphotostudio.com.np",
  whatsapp: "9779866060450",
  address: "Your studio location, Nepal",
  keywords: [
    "Sunrise Photo Digital Studio",
    "wedding photography Nepal",
    "portrait studio Nepal",
    "photo studio Nepal",
    "event photography Nepal",
    "passport photo studio",
    "wedding videography Nepal",
    "cinematic reels Nepal",
    "photo albums and frames Nepal",
    "sunrisedigitalphotostudio.com.np"
  ],
  socialLinks: [
    { label: "Facebook", href: "https://facebook.com/" },
    { label: "Instagram", href: "https://instagram.com/" },
    { label: "YouTube", href: "https://youtube.com/" }
  ]
};

export type ResolvedSiteConfig = typeof siteConfig & {
  tagline?: string;
  logo?: string;
};

type SiteSettingsDocument = Partial<
  Pick<ResolvedSiteConfig, "name" | "description" | "phone" | "email" | "whatsapp" | "address" | "tagline" | "logo">
>;

const siteSettingsQuery = groq`*[_type == "siteSettings"][0]{
  "name": studioName,
  tagline,
  description,
  phone,
  email,
  whatsapp,
  address,
  "logo": logo.asset->url
}`;

export const getSiteSettings = async (): Promise<ResolvedSiteConfig> => {
  const settings = await fetchSanityOrFallback<SiteSettingsDocument>(siteSettingsQuery, {});
  const resolvedName = settings.name ?? siteConfig.name;
  const derivedShortName = resolvedName
    .replace(/\s*Photo\s+Digital\s+Studio/i, " Studio")
    .replace(/\s*Photo\s+Studio/i, " Studio");

  return {
    ...siteConfig,
    name: resolvedName,
    shortName: derivedShortName || siteConfig.shortName,
    description: settings.description ?? siteConfig.description,
    phone: settings.phone ?? siteConfig.phone,
    email: settings.email ?? siteConfig.email,
    whatsapp: settings.whatsapp ?? siteConfig.whatsapp,
    address: settings.address ?? siteConfig.address,
    tagline: settings.tagline ?? siteConfig.description,
    logo: settings.logo
  };
};

export const navigationLinks = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Gallery", href: "/gallery" },
  { label: "Videos", href: "/videos" },
  { label: "Merchandise", href: "/merchandise" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" }
];
