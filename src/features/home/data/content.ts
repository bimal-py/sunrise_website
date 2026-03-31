import groq from "groq";

import { fetchSanityOrFallback } from "@/core/sanity/client";

export type HomePageData = {
  sections: {
    strengths: { eyebrow: string; title: string; description: string };
    services: { eyebrow: string; title: string; description: string };
    gallery: { eyebrow: string; title: string; description: string };
    videos: { eyebrow: string; title: string; description: string };
    merchandise: { eyebrow: string; title: string; description: string };
    process: { eyebrow: string; title: string; description: string };
  };
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
  sections: {
    strengths: {
      eyebrow: "Studio Strengths",
      title: "A premium studio website that is clear, fast, and easy to trust.",
      description:
        "Every section is designed to help visitors discover your work, understand your services, compare printed products, and contact you quickly."
    },
    services: {
      eyebrow: "Services",
      title: "Professional services for weddings, portraits, events, and everyday studio needs.",
      description:
        "Each service is presented clearly so visitors can understand what you offer, what kind of work you handle, and how to inquire without confusion."
    },
    gallery: {
      eyebrow: "Featured Gallery",
      title: "A curated portfolio that gives visitors a clear feel for your style.",
      description:
        "The homepage highlights your strongest categories, while the gallery page can hold the wider story of your studio work."
    },
    videos: {
      eyebrow: "Video Storytelling",
      title: "Video highlights that stay rich for visitors and light for performance.",
      description:
        "Long-form wedding films and social reels are best embedded from platforms like YouTube and Facebook, helping the site stay fast while still feeling dynamic."
    },
    merchandise: {
      eyebrow: "Merchandise",
      title: "A merchandise catalog that feels like ecommerce while still converting through inquiry.",
      description:
        "Products can show category, offer badge, current price, previous price, and availability without needing an online payment gateway yet."
    },
    process: {
      eyebrow: "How The Website Works",
      title: "A cleaner path from first impression to confirmed inquiry.",
      description:
        "The website keeps a maintainable structure behind the scenes while guiding visitors through storytelling, service discovery, and product presentation."
    }
  },
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
  sections,
  hero,
  highlights,
  stats,
  process,
  testimonials
}`;

export const getHomePageData = async (): Promise<HomePageData> => {
  const data = await fetchSanityOrFallback<Partial<HomePageData>>(homePageQuery, fallbackHomePage);

  return {
    sections: {
      ...fallbackHomePage.sections,
      ...data.sections
    },
    hero: {
      ...fallbackHomePage.hero,
      ...data.hero
    },
    highlights: data.highlights?.length ? data.highlights : fallbackHomePage.highlights,
    stats: data.stats?.length ? data.stats : fallbackHomePage.stats,
    process: data.process?.length ? data.process : fallbackHomePage.process,
    testimonials: data.testimonials?.length ? data.testimonials : fallbackHomePage.testimonials
  };
};
