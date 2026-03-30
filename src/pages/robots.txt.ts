import { siteConfig } from "@/core/config/site";

export const GET = () => {
  const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? siteConfig.url;

  return new Response(
    `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap-index.xml\n`,
    {
      headers: {
        "Content-Type": "text/plain"
      }
    }
  );
};
