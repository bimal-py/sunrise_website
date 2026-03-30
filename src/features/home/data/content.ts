import groq from "groq";

import { fetchSanityOrFallback } from "@/core/sanity/client";

export type HomePageData = {
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    primaryCta: { label: string; href: string };
    secondaryCta: { label: string; href: string };
  };
  highlights: Array<{ title: string; description: string }>;
  stats: Array<{ value: string; label: string }>;
  process: Array<{ title: string; description: string }>;
  testimonials: Array<{ name: string; role: string; quote: string }>;
};

const fallbackHomePage: HomePageData = {
  hero: {
    eyebrow: "Wedding stories, portraits, passport photos, reels, albums, and framed prints",
    title: "Photographs that feel elegant today and meaningful for years to come.",
    description:
      "Sunrise Photo Digital Studio brings together wedding coverage, family portraits, event photography, passport photos, and custom printed products in one polished digital home.",
    primaryCta: { label: "Book A Session", href: "/contact" },
    secondaryCta: { label: "Explore Gallery", href: "/gallery" }
  },
  highlights: [
    {
      title: "Wedding And Portrait Focus",
      description: "Coverage designed for weddings, portraits, engagements, family sessions, and milestone events."
    },
    {
      title: "Simple Inquiry Journey",
      description: "Visitors can explore services, compare products, and contact the studio quickly through familiar channels."
    },
    {
      title: "Fast And Search Friendly",
      description: "The website is structured for speed, clean navigation, and stronger visibility on search engines."
    }
  ],
  stats: [
    { value: "Wedding", label: "Stories captured with emotional and timeless coverage" },
    { value: "Portrait", label: "Studio and outdoor sessions tailored for every age" },
    { value: "Print", label: "Albums, frames, and keepsakes presented with care" }
  ],
  process: [
    {
      title: "Explore",
      description: "Browse weddings, portraits, events, passport photos, reels, and printed products in one place."
    },
    {
      title: "Shortlist",
      description: "Compare service categories, merchandise offers, and video work before making an inquiry."
    },
    {
      title: "Inquire",
      description: "Book through WhatsApp, phone, Facebook, or the website inquiry form with minimal friction."
    }
  ],
  testimonials: [
    {
      name: "Wedding Client",
      role: "Bride And Groom Session",
      quote: "Our final photos looked warm, elegant, and beautifully edited from the first frame to the last."
    },
    {
      name: "Family Client",
      role: "Portrait Session",
      quote: "The team made everyone feel comfortable and the finished portraits looked natural and premium."
    }
  ]
};

const homePageQuery = groq`*[_type == "homePage"][0]{
  hero,
  highlights,
  stats,
  process,
  testimonials
}`;

export const getHomePageData = async () =>
  fetchSanityOrFallback<HomePageData>(homePageQuery, fallbackHomePage);
