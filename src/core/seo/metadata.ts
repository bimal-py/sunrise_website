import { siteConfig, type ResolvedSiteConfig } from "@/core/config/site";

type MetadataInput = {
  title: string;
  description: string;
  pathname?: string;
  image?: string;
};

export const buildMetadata = ({
  title,
  description,
  pathname = "/",
  image = "/brand/sunrise-logo.png",
  settings = siteConfig
}: MetadataInput & { settings?: ResolvedSiteConfig }) => {
  const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? settings.url;
  const canonical = new URL(pathname, siteUrl).toString();
  const ogImage = new URL(image, siteUrl).toString();

  return {
    canonical,
    ogImage,
    pageTitle: `${title} | ${settings.name}`,
    description
  };
};

export const buildLocalBusinessSchema = (settings: ResolvedSiteConfig = siteConfig) => ({
  "@context": "https://schema.org",
  "@type": "PhotographyBusiness",
  name: settings.name,
  image: settings.logo ?? `${settings.url}/brand/sunrise-logo.png`,
  url: settings.url,
  telephone: settings.phone,
  email: settings.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: settings.address,
    addressCountry: "NP"
  },
  sameAs: settings.socialLinks.map((item) => item.href),
  priceRange: "$$"
});
