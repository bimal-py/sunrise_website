import type { SiteSettings } from "@/features/site/domain/entities";
import { absoluteUrl } from "@/lib/seo/metadata";

const logo = "/brand/logo-512.jpg";

function sameAs(site: SiteSettings): string[] {
  return Object.values(site.social).filter(Boolean);
}

/** WebSite: the site's name for search results. Home page only. */
export function websiteJsonLd(site: SiteSettings) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    alternateName: [site.alternateName, site.nameNe].filter(Boolean),
    url: absoluteUrl("/"),
    inLanguage: ["en", "ne"],
  };
}

/** The studio as a local business. Only facts we hold: no ratings, hours or prices. */
export function localBusinessJsonLd(site: SiteSettings) {
  const { contact, address } = site;
  const image = site.seo.ogImage?.ogImage ?? "/brand/og-default.jpg";
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": absoluteUrl("/#studio"),
    name: site.name,
    ...(site.alternateName ? { alternateName: site.alternateName } : {}),
    description: site.description,
    url: absoluteUrl("/"),
    logo: absoluteUrl(logo),
    image: absoluteUrl(image),
    ...(contact.phoneHref ? { telephone: contact.phoneHref.replace("tel:", "") } : {}),
    ...(contact.email ? { email: contact.email } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: address.street,
      addressLocality: address.locality,
      addressRegion: [address.district, address.region].filter(Boolean).join(", "),
      ...(address.postalCode ? { postalCode: address.postalCode } : {}),
      addressCountry: address.countryCode,
    },
    ...(address.latitude !== null && address.longitude !== null
      ? { geo: { "@type": "GeoCoordinates", latitude: address.latitude, longitude: address.longitude } }
      : {}),
    ...(address.mapsUrl ? { hasMap: address.mapsUrl } : {}),
    areaServed: site.areaServed.map((name) => ({ "@type": "Place", name })),
    ...(site.founder ? { founder: { "@type": "Person", name: site.founder.name } } : {}),
    sameAs: sameAs(site),
  };
}

/** A studio service or print product, offered by the studio. */
export function serviceJsonLd(site: SiteSettings, input: { name: string; description: string; path: string; serviceType: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: input.name,
    description: input.description,
    serviceType: input.serviceType,
    url: absoluteUrl(input.path),
    provider: { "@id": absoluteUrl("/#studio"), "@type": "LocalBusiness", name: site.name },
    areaServed: site.areaServed.map((name) => ({ "@type": "Place", name })),
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
