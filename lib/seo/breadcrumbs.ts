import { absoluteUrl } from "@/lib/seo/metadata";

export type Crumb = { label: string; href?: string };

/**
 * BreadcrumbList JSON-LD from the same `Crumb[]` the visible <Breadcrumbs>
 * renders, so the trail users see and the one search engines read can't drift.
 */
export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.label,
      ...(crumb.href ? { item: absoluteUrl(crumb.href) } : {}),
    })),
  };
}
