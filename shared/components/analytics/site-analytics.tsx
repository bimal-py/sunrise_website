import Script from "next/script";
import { siteConfig } from "@/lib/config/site";

/**
 * Microsoft Clarity. Server component: on anything but the Vercel production
 * deployment (local dev, `next start`, preview branches) it renders nothing, so
 * test visits never pollute the recordings and no third-party code loads.
 *
 * lazyOnload = fetched at browser idle after the page has loaded, with no
 * preload hint, so it can't compete with the page's own resources (LCP/INP).
 * Tradeoff: a visitor who leaves within about a second may not be recorded.
 * App Router navigations are tracked automatically (Clarity watches the DOM).
 */
export function SiteAnalytics() {
  if (process.env.VERCEL_ENV !== "production" || !siteConfig.clarityId) return null;

  return (
    <Script id="clarity" strategy="lazyOnload">
      {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${siteConfig.clarityId}");`}
    </Script>
  );
}
