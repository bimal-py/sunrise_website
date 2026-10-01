import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter, Noto_Sans_Devanagari } from "next/font/google";
import { siteUrl } from "@/lib/config/site";
import { absoluteUrl, defaultOgImage } from "@/lib/seo/metadata";
import { getSiteSettings } from "@/features/site/data/settings.repository";
import "./globals.css";

// Variable fonts: one file each covers every weight used.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Display serif for h1/h2 (see globals.css), matching the logo's lettering.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
});

// Applied to every `lang="ne"` element (see `:lang(ne)` in globals.css). Only the
// Devanagari subset; Latin text inside Nepali lines falls back to Inter.
const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-devanagari",
  display: "swap",
  preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  const ogImage = site.seo.ogImage?.ogImage ?? defaultOgImage;
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: site.defaultTitle,
      template: `%s | ${site.name}`,
    },
    description: site.description,
    applicationName: site.name,
    category: "photography",
    formatDetection: { email: false, address: false, telephone: false },
    alternates: { canonical: absoluteUrl("/") },
    openGraph: {
      title: site.name,
      description: site.description,
      type: "website",
      locale: site.locale,
      url: absoluteUrl("/"),
      siteName: site.name,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: site.name,
      description: site.description,
      images: [ogImage],
    },
    // Search Console / Bing Webmaster ownership tags (dashboard → Settings → SEO).
    verification: {
      ...(site.seo.googleVerification ? { google: site.seo.googleVerification } : {}),
      ...(site.seo.bingVerification ? { other: { "msvalidate.01": site.seo.bingVerification } } : {}),
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#101011",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning (this element only, not its children): browser extensions such as
    // ColorZilla or Grammarly add attributes to <html>/<body> before React loads.
    <html lang="en" className={`${inter.variable} ${cormorant.variable} ${devanagari.variable}`} suppressHydrationWarning>
      <body className="flex min-h-[100dvh] flex-col" suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only absolute left-4 top-4 z-[60] rounded-control bg-primary px-4 py-2 text-sm font-medium text-on-primary focus:not-sr-only"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
