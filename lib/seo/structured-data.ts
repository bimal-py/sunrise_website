import { siteConfig } from "@/lib/config/site";
import { absoluteUrl } from "@/lib/seo/metadata";

const logo = "/brand/logo-512.jpg";

/** WebSite: the site's name for search results. Home page only. */
export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    alternateName: [siteConfig.alternateName, siteConfig.nameNe],
    url: absoluteUrl("/"),
    inLanguage: ["en", "ne"],
  };
}

/** The studio as a local business. Only facts we hold: no ratings, hours or prices. */
export function localBusinessJsonLd() {
  const { contact, address } = siteConfig;
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": absoluteUrl("/#studio"),
    name: siteConfig.name,
    alternateName: siteConfig.alternateName,
    description: siteConfig.description,
    url: absoluteUrl("/"),
    logo: absoluteUrl(logo),
    image: absoluteUrl("/brand/og-default.jpg"),
    telephone: contact.phoneHref.replace("tel:", ""),
    email: contact.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: address.street,
      addressLocality: address.locality,
      addressRegion: `${address.district}, ${address.region}`,
      addressCountry: address.countryCode,
    },
    areaServed: siteConfig.areaServed.map((name) => ({ "@type": "Place", name })),
    sameAs: Object.values(siteConfig.social),
  };
}

/** A studio service or print product, offered by the studio. */
export function serviceJsonLd(input: { name: string; description: string; path: string; serviceType: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: input.name,
    description: input.description,
    serviceType: input.serviceType,
    url: absoluteUrl(input.path),
    provider: { "@id": absoluteUrl("/#studio"), "@type": "LocalBusiness", name: siteConfig.name },
    areaServed: siteConfig.areaServed.map((name) => ({ "@type": "Place", name })),
  };
}

/** ItemList for an index page: its entries, in order. */
export function itemListJsonLd(name: string, items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}
