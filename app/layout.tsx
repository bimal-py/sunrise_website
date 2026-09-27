import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter, Noto_Sans_Devanagari } from "next/font/google";
import { siteConfig } from "@/lib/config/site";
import { absoluteUrl, defaultOgImage } from "@/lib/seo/metadata";
import { SiteFooter } from "@/features/site/presentation/components/site-footer";
import { SiteHeader } from "@/features/site/presentation/components/site-header";
import { SiteAnalytics } from "@/shared/components/analytics/site-analytics";
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

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name}: wedding photos, films and prints in Syangja`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  category: "photography",
  formatDetection: { email: false, address: false, telephone: false },
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    type: "website",
    locale: siteConfig.locale,
    url: absoluteUrl("/"),
    siteName: siteConfig.name,
    images: [{ url: defaultOgImage, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [defaultOgImage],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
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
        <SiteHeader />
        <div id="main-content" className="flex flex-1 flex-col">
          {children}
        </div>
        <SiteFooter />
        <SiteAnalytics />
      </body>
    </html>
  );
}
